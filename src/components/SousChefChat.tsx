import { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Send,
  Camera,
  CameraOff,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  generateChefResponse,
  detectMoodFromCamera,
  getProactiveMessage,
  loadSousChefState,
  saveSousChefState,
  type ChatMessage,
  type UserMood,
  type SousChefState,
} from "@/services/sousChef";
import {
  createPorcupineEngine,
  createSpeechFallbackEngine,
  type WakeWordEngine,
} from "@/services/wakeWord";

interface SousChefChatProps {
  lowStockCount: number;
  robinSleepTimeout?: number; // seconds, from settings
  robinVoiceEnabled?: boolean;
}

export function SousChefChat({ lowStockCount, robinSleepTimeout = 10 }: SousChefChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [miniChatOpen, setMiniChatOpen] = useState(false);
  const [miniMessage, setMiniMessage] = useState("");
  const [voiceActive, setVoiceActive] = useState(false); // Siri-style: actively recording
  const [liveTranscript, setLiveTranscript] = useState(""); // Live text as user speaks
  const [state, setState] = useState<SousChefState>(loadSousChefState);
  const [input, setInput] = useState("");
  const [detectedMood, setDetectedMood] = useState<UserMood | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Robin bird chirp
  const playRobinChirp = useCallback(() => {
    try {
      const ctx = audioCtxRef.current || new AudioContext();
      audioCtxRef.current = ctx;
      function chirp(startTime: number) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(2800, startTime);
        osc.frequency.exponentialRampToValueAtTime(2200, startTime + 0.06);
        osc.frequency.exponentialRampToValueAtTime(3200, startTime + 0.12);
        osc.frequency.exponentialRampToValueAtTime(2600, startTime + 0.18);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
        gain.gain.setValueAtTime(0.15, startTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
        osc.start(startTime);
        osc.stop(startTime + 0.22);
      }
      const now = ctx.currentTime;
      chirp(now);
      chirp(now + 0.3);
    } catch {}
  }, []);

  // Process voice commands
  const processVoiceCommand = useCallback((transcript: string) => {
    const t = transcript.toLowerCase().trim();
    let response = "";

    if ((t.includes("open") && t.includes("chat")) || t.includes("full chat")) {
      response = "Opening chat.";
      setIsOpen(true);
      setMiniChatOpen(false);
    } else if (t.includes("menu") || t.includes("food") || t.includes("cook") || t.includes("dish") || t.includes("recipe")) {
      response = "Opening menu.";
      window.dispatchEvent(new CustomEvent("robin-navigate", { detail: "menu" }));
    } else if (t.includes("inventory") || t.includes("pantry") || t.includes("stock") || t.includes("groceries")) {
      response = "Opening inventory.";
      window.dispatchEvent(new CustomEvent("robin-navigate", { detail: "inventory" }));
    } else if (t.includes("routine") || t.includes("schedule") || t.includes("meal plan") || t.includes("daily")) {
      response = "Opening routine.";
      window.dispatchEvent(new CustomEvent("robin-navigate", { detail: "routine" }));
    } else if (t.includes("alexa") || t.includes("order") || t.includes("amazon") || t.includes("delivery") || t.includes("restock")) {
      response = "Opening orders.";
      window.dispatchEvent(new CustomEvent("robin-navigate", { detail: "events" }));
    } else if (t.includes("setting") || t.includes("config") || t.includes("preference")) {
      response = "Opening settings.";
      window.dispatchEvent(new CustomEvent("robin-navigate", { detail: "settings" }));
    } else if (t.includes("cart")) {
      response = "Opening cart.";
      window.dispatchEvent(new CustomEvent("robin-navigate", { detail: "cart" }));
    } else if (t.includes("add")) {
      const itemMatch = t.match(/add\s+(.+?)(?:\s+to\s+(?:cart|list|bag))?$/);
      const itemName = itemMatch ? itemMatch[1].replace(/to\s*(cart|list|bag)/, "").trim() : "";
      if (itemName) {
        response = `Adding "${itemName}" to cart.`;
        window.dispatchEvent(new CustomEvent("robin-cart-add", { detail: itemName }));
      } else {
        response = "What should I add?";
      }
    } else if (t.length > 2) {
      response = `I heard: "${transcript}"`;
    }

    if (response) {
      setMiniMessage(response);
      setMiniChatOpen(true);
      // Auto-dismiss after timeout
      setTimeout(() => { setMiniChatOpen(false); setMiniMessage(""); }, robinSleepTimeout * 1000);
    }
  }, [playRobinChirp, robinSleepTimeout]);

  /** 
   * Voice logic — exactly as described:
   * 1. Mic OFF by default
   * 2. "Hey Robin" or TAP = turns mic ON for ONE command
   * 3. Shows live transcript, processes command, then mic OFF
   * 4. Next command requires another tap or "Hey Robin"
   */
  const activeRecognitionRef = useRef<SpeechRecognition | null>(null);

  // Take ONE voice command, then turn mic off
  const listenForOneCommand = useCallback(() => {
    const SpeechRecognitionCtor = window.SpeechRecognition || (window as unknown as { webkitSpeechRecognition: typeof window.SpeechRecognition }).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setMiniMessage("Voice not supported. Use Chrome.");
      setMiniChatOpen(true);
      setTimeout(() => { setMiniChatOpen(false); setMiniMessage(""); }, 3000);
      return;
    }
    if (voiceActive) return; // Already listening

    setVoiceActive(true);
    setLiveTranscript("");

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    activeRecognitionRef.current = recognition;

    let acted = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (acted) return;
      let interim = "";
      let finalTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += t;
        else interim += t;
      }
      setLiveTranscript(finalTranscript || interim);

      // Quick match on interim for instant response
      const text = (finalTranscript || interim).toLowerCase().replace(/hey\s*robin\s*/, "").replace(/robin\s*/, "").trim();
      if (!finalTranscript && interim && text.length > 3) {
        const hasMatch = ["menu","inventory","routine","alexa","order","cart","setting","pantry","cook","recipe","groceries","daily"].some(w => text.includes(w));
        if (hasMatch) {
          acted = true;
          recognition.stop();
          setVoiceActive(false);
          setLiveTranscript("");
          processVoiceCommand(text);
          return;
        }
      }

      if (finalTranscript) {
        acted = true;
        setVoiceActive(false);
        setLiveTranscript("");
        if (text.length > 0) processVoiceCommand(text);
      }
    };

    recognition.onerror = () => {
      setVoiceActive(false);
      setLiveTranscript("");
      setMiniMessage("Didn't catch that. Tap or say \"Hey Robin\".");
      setMiniChatOpen(true);
      setTimeout(() => { setMiniChatOpen(false); setMiniMessage(""); }, 3000);
    };

    recognition.onend = () => {
      setVoiceActive(false);
      setLiveTranscript("");
    };

    try { recognition.start(); } catch { setVoiceActive(false); }
  }, [voiceActive, processVoiceCommand]);

  // Wake word detection — Picovoice Porcupine (on-device) with Web Speech fallback
  const listenRef = useRef(listenForOneCommand);
  useEffect(() => { listenRef.current = listenForOneCommand; }, [listenForOneCommand]);
  const voiceActiveRef = useRef(voiceActive);
  useEffect(() => { voiceActiveRef.current = voiceActive; }, [voiceActive]);

  useEffect(() => {
    let engine: WakeWordEngine | null = null;

    async function init() {
      // Try Picovoice first (on-device, low latency)
      const porcupine = await createPorcupineEngine(() => {
        if (!voiceActiveRef.current) {
          console.log("[WakeWord] Triggered → activating command listener");
          listenRef.current();
        }
      });

      if (porcupine) {
        engine = porcupine;
        await porcupine.start();
        console.log("[WakeWord] Using Picovoice Porcupine (on-device)");
      } else {
        // Fallback to Web Speech API wake detection
        engine = createSpeechFallbackEngine(() => {
          if (!voiceActiveRef.current) {
            console.log("[WakeWord] Fallback triggered → activating command listener");
            listenRef.current();
          }
        });
        await engine.start();
        console.log("[WakeWord] Using Web Speech fallback");
      }
    }

    init();

    return () => {
      if (engine) engine.stop();
    };
  }, []);

  // Save state on changes
  useEffect(() => {
    saveSousChefState(state);
  }, [state]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.messages]);

  // Proactive check-in when opening
  useEffect(() => {
    if (isOpen && state.messages.length <= 1) {
      const hour = new Date().getHours();
      const proactive = getProactiveMessage(hour, lowStockCount);
      if (proactive) {
        setTimeout(() => {
          setState((prev) => ({
            ...prev,
            messages: [...prev.messages, proactive],
          }));
        }, 1500);
      }
    }
  }, [isOpen]);

  // Camera toggle for mood detection
  const toggleCamera = useCallback(() => {
    const newCameraState = !state.cameraActive;
    setState((prev) => ({ ...prev, cameraActive: newCameraState }));

    if (newCameraState) {
      // Simulate mood detection
      const mood = detectMoodFromCamera();
      setDetectedMood(mood);

      // Chef reacts to mood
      setTimeout(() => {
        const moodMessage: ChatMessage = {
          id: "mood-" + Date.now(),
          role: "chef",
          content: getMoodReaction(mood),
          timestamp: new Date().toISOString(),
          mood,
          action: { type: "camera_read" },
        };
        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, moodMessage],
          lastMoodDetected: mood,
        }));
      }, 1200);
    }
  }, [state.cameraActive]);

  // Send message
  const handleSend = useCallback(() => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: "user-" + Date.now(),
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMsg],
      isTyping: true,
      conversationContext: [...prev.conversationContext, input.trim()].slice(-10),
    }));
    setInput("");

    // Simulate chef thinking
    setTimeout(() => {
      const response = generateChefResponse(
        userMsg.content,
        detectedMood || undefined,
        state.conversationContext,
      );
      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, response],
        isTyping: false,
      }));
    }, 800 + Math.random() * 1200);
  }, [input, detectedMood, state.conversationContext]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Quick reply buttons
  const quickReplies = [
    "What should I cook?",
    "I'm tired today",
    "Restock essentials",
    "Change preferences",
  ];

  // Floating logo (closed state) — TAP TO TALK
  if (!isOpen) {
    return (
      <>
        <DraggableLogo
          onClick={listenForOneCommand}
          onLongPress={() => setIsOpen(true)}
          lowStockCount={lowStockCount}
          voiceActive={voiceActive}
          liveTranscript={liveTranscript}
          onNotification={playRobinChirp}
        />
        {miniChatOpen && (
          <MiniChatBubble message={miniMessage} onClose={() => { setMiniChatOpen(false); setMiniMessage(""); }} />
        )}
      </>
    );
  }

  // Chat panel (open state) — 600x400 resizable popup, not full screen
  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col bg-[#0d1117] border border-[#30363d] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden"
      style={{ width: "min(600px, calc(100vw - 32px))", height: "min(400px, calc(100vh - 120px))", resize: "both" }}>
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-[#30363d]/50 px-4 py-3 shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-full overflow-hidden border border-[#31a8ff]/30">
          <img src="/chef-logo.png" alt="Robin" className="h-full w-full object-cover" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-[#e6edf3]">Robin</p>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#3fb950] animate-pulse shadow-[0_0_4px_#3fb950]" />
            <span className="text-[11px] text-[#8b949e]">
              {state.cameraActive
                ? `Reading your vibe... ${detectedMood ? `(${detectedMood.expression})` : ""}`
                : "Online"}
            </span>
          </div>
        </div>

        {/* Camera toggle */}
        <button
          onClick={toggleCamera}
          className={cn(
            "rounded-full p-2 transition-all",
            state.cameraActive
              ? "bg-[#3fb950]/15 text-[#3fb950] border border-[#3fb950]/30"
              : "bg-[#161b22] text-[#8b949e] border border-[#30363d]/50 hover:text-[#e6edf3]",
          )}
          aria-label={state.cameraActive ? "Disable camera" : "Enable camera"}
        >
          {state.cameraActive ? (
            <Camera className="h-5 w-5" />
          ) : (
            <CameraOff className="h-5 w-5" />
          )}
        </button>

        <button
          onClick={() => setIsOpen(false)}
          className="rounded-full bg-[#161b22] border border-[#30363d]/50 p-2 text-[#8b949e] hover:text-[#e6edf3]"
          aria-label="Close chat"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {/* Camera preview (when active) */}
      {state.cameraActive && (
        <div className="border-b border-[#30363d]/50 bg-[#161b22] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#0d1117] border border-[#3fb950]/30">
              <Camera className="h-6 w-6 text-[#3fb950] animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#3fb950]">Camera Active</p>
              {detectedMood && (
                <div className="mt-1 space-y-0.5">
                  <p className="text-[11px] text-[#8b949e]">Expression: <span className="text-[#e6edf3]">{detectedMood.expression}</span></p>
                  <p className="text-[11px] text-[#8b949e]">Energy: <span className="text-[#e6edf3]">{detectedMood.energy}</span></p>
                  <p className="text-[11px] text-[#8b949e]">Confidence: <span className="text-[#e6edf3]">{Math.round(detectedMood.confidence * 100)}%</span></p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {state.messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {state.isTyping && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#31a8ff]/15 overflow-hidden">
              <img src="/chef-logo.png" alt="" className="h-full w-full object-cover" />
            </div>
            <div className="flex gap-1 rounded-2xl bg-[#161b22] border border-[#30363d]/50 px-4 py-3">
              <span className="h-2 w-2 rounded-full bg-[#8b949e] animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-2 w-2 rounded-full bg-[#8b949e] animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-2 w-2 rounded-full bg-[#8b949e] animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>

      {/* Quick replies */}
      <div className="border-t border-[#30363d]/30 px-4 py-2">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {quickReplies.map((reply) => (
            <button key={reply} onClick={() => { setInput(reply); setTimeout(() => handleSend(), 50); }}
              className="shrink-0 rounded-full border border-[#30363d]/50 bg-[#161b22] px-3 py-1.5 text-[11px] text-[#8b949e] hover:border-[#31a8ff]/30 hover:text-[#31a8ff] transition-colors">
              {reply}
            </button>
          ))}
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-[#30363d]/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center rounded-2xl bg-[#161b22] border border-[#30363d]/50 px-4 py-2.5">
            <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Talk to your sous chef..."
              className="flex-1 bg-transparent text-sm text-[#e6edf3] placeholder:text-[#484f58] outline-none" />
            <Sparkles className="h-4 w-4 text-[#31a8ff]/50" />
          </div>
          <button onClick={handleSend} disabled={!input.trim()}
            className={cn("flex h-10 w-10 items-center justify-center rounded-full transition-all",
              input.trim() ? "bg-[#31a8ff] text-white shadow-[0_0_8px_#31a8ff40]" : "bg-[#161b22] text-[#484f58]"
            )} aria-label="Send message">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Message Bubble ─── */
function MessageBubble({ message }: { message: ChatMessage }) {
  const isChef = message.role === "chef";
  const isSystem = message.role === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] text-white/40">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-2", isChef ? "justify-start" : "justify-end")}>
      {isChef && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#31a8ff]/15 overflow-hidden">
          <img src="/chef-logo.png" alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5",
          isChef
            ? "bg-[#161b22] border border-[#30363d]/50 text-[#e6edf3]"
            : "bg-[#31a8ff] text-white",
        )}
      >
        <p className="text-sm leading-relaxed">{message.content}</p>
        {message.mood && (
          <p className="mt-1 text-[10px] opacity-60">
            📷 Detected: {message.mood.expression} · {message.mood.energy} energy
          </p>
        )}
        {message.action && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", isChef ? "bg-[#21262d] text-[#8b949e]" : "bg-white/20 text-white")}>
              {message.action.type === "suggest_meal" && "🍽 Meal suggestion"}
              {message.action.type === "reorder" && "🛒 Reorder"}
              {message.action.type === "ask_preference" && "💡 Learning"}
              {message.action.type === "camera_read" && "📷 Expression read"}
              {message.action.type === "tip" && "💡 Tip"}
              {message.action.type === "add_to_cart" && "➕ Add to cart"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Helper ─── */
function getMoodReaction(mood: UserMood): string {
  const reactions: Record<UserMood["expression"], string[]> = {
    happy: [
      "You look happy today! 😊 Let's make something special to match the mood.",
      "Great vibes! I'm thinking something fun and flavorful for today.",
    ],
    neutral: [
      "You seem calm and steady — perfect for trying something new. Interested?",
      "Neutral energy — want me to suggest your reliable favorites or surprise you?",
    ],
    tired: [
      "I can tell you're a bit drained. Let me suggest the easiest options tonight — zero stress.",
      "Long day? Say no more. I'll find you something that practically makes itself.",
    ],
    excited: [
      "You're fired up! 🔥 Want to try that recipe you've been eyeing? Today's the day!",
      "Love the excitement! How about we cook something challenging and fun?",
    ],
    uncertain: [
      "Seems like you're not sure what you want — totally fine! Let me ask a couple questions to narrow it down.",
      "I'm sensing some indecision. Sweet or savory? That usually helps!",
    ],
  };
  return reactions[mood.expression][Math.floor(Math.random() * reactions[mood.expression].length)];
}

/* ─── Mini Chat Bubble (iMessage style, appears next to logo) ─── */
function MiniChatBubble({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed top-56 right-[220px] z-50 animate-in fade-in slide-in-from-right-4 duration-300"
      style={{ maxWidth: "280px" }}>
      <div className="relative rounded-2xl bg-[#1c1c1e] border border-[#3a3a3c] px-4 py-3 shadow-2xl shadow-black/50 backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1.5">
          <p className="text-[11px] font-semibold text-[#e6edf3]">Robin</p>
          <span className="text-[9px] text-[#8b949e]">now</span>
          <button onClick={onClose} className="ml-auto text-[#8b949e] hover:text-white text-xs">✕</button>
        </div>
        {/* Message */}
        <p className="text-[13px] text-[#e6edf3] leading-relaxed">{message}</p>
        <p className="mt-1.5 text-[8px] text-[#8b949e] italic">Say "ok" or "close" to dismiss</p>

        {/* Arrow pointing right toward the logo */}
        <div className="absolute top-6 -right-2 h-3 w-3 rotate-45 bg-[#1c1c1e] border-r border-t border-[#3a3a3c]" />
      </div>
    </div>
  );
}

/* ─── Draggable Logo with Notification Glow ─── */

type NotificationType = "grocery" | "urgent" | "reminder" | "delivery" | "idle";

interface Notification {
  type: NotificationType;
  message: string;
}

// Simulated notifications cycling
const MOCK_NOTIFICATIONS: Notification[] = [
  { type: "grocery", message: "Milk & Eggs running low" },
  { type: "urgent", message: "Security camera: motion detected" },
  { type: "reminder", message: "Meal prep at 3 PM" },
  { type: "delivery", message: "Amazon package arriving today" },
  { type: "grocery", message: "Bananas out of stock" },
  { type: "urgent", message: "Missed call from Mom" },
  { type: "delivery", message: "Fresh order out for delivery" },
  { type: "reminder", message: "Take vitamins" },
];

const GLOW_COLORS: Record<NotificationType, { border: string; shadow: string; bg: string; label: string }> = {
  grocery: { border: "#3fb950", shadow: "0 0 20px #3fb95060, 0 0 40px #3fb95030", bg: "rgba(63,185,80,0.15)", label: "🥬 Grocery" },
  urgent: { border: "#f85149", shadow: "0 0 20px #f8514960, 0 0 40px #f8514930", bg: "rgba(248,81,73,0.15)", label: "🚨 Urgent" },
  reminder: { border: "#f0c000", shadow: "0 0 20px #f0c00060, 0 0 40px #f0c00030", bg: "rgba(240,192,0,0.15)", label: "📋 Reminder" },
  delivery: { border: "#f0883e", shadow: "0 0 20px #f0883e60, 0 0 40px #f0883e30", bg: "rgba(240,136,62,0.15)", label: "📦 Delivery" },
  idle: { border: "#31a8ff", shadow: "0 0 12px #31a8ff30", bg: "rgba(49,168,255,0.1)", label: "" },
};

function DraggableLogo({ onClick, onLongPress, lowStockCount, voiceActive, liveTranscript, onNotification }: { onClick: () => void; onLongPress: () => void; lowStockCount: number; voiceActive: boolean; liveTranscript: string; onNotification: () => void }) {
  const [position, setPosition] = useState({ x: window.innerWidth - 220, y: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);
  const [pulsePhase, setPulsePhase] = useState(0);
  const [isActivePhase, setIsActivePhase] = useState(false); // true = heartbeat, false = resting
  const logoRef = useRef<HTMLDivElement>(null);

  // Notification pattern: heartbeat 5s → idle 30s → heartbeat 5s with next color
  useEffect(() => {
    let notifIndex = 0;
    let timeout: ReturnType<typeof setTimeout>;

    function showNotification() {
      // Pick next notification
      setCurrentNotification(MOCK_NOTIFICATIONS[notifIndex % MOCK_NOTIFICATIONS.length]);
      notifIndex++;
      setIsActivePhase(true);
      onNotification(); // Robin chirp on new notification

      // Active heartbeat for 5 seconds
      timeout = setTimeout(() => {
        setIsActivePhase(false);
        setCurrentNotification(null);

        // Rest for 30 seconds, then show next
        timeout = setTimeout(showNotification, 30000);
      }, 5000);
    }

    // Start first notification after 2s
    timeout = setTimeout(showNotification, 2000);

    return () => clearTimeout(timeout);
  }, []);

  // If low stock, override with grocery notification during active phase
  useEffect(() => {
    if (lowStockCount > 0 && !currentNotification && !isActivePhase) {
      setCurrentNotification({ type: "grocery", message: `${lowStockCount} items running low` });
      setIsActivePhase(true);
      setTimeout(() => {
        setIsActivePhase(false);
        setCurrentNotification(null);
      }, 5000);
    }
  }, [lowStockCount]);

  // Heartbeat pulse — only animates during active phase
  useEffect(() => {
    if (!isActivePhase) {
      setPulsePhase(0);
      return;
    }
    const interval = setInterval(() => {
      setPulsePhase((p) => (p + 1) % 100);
    }, 40); // slightly slower for calming effect
    return () => clearInterval(interval);
  }, [isActivePhase]);

  const notifType: NotificationType = currentNotification?.type || "idle";
  const glowStyle = GLOW_COLORS[notifType];

  // Heartbeat: soft double-pulse (lub-dub) pattern
  const heartbeatCycle = (pulsePhase / 100) * Math.PI * 2;
  const heartbeat = isActivePhase
    ? 1 + 0.025 * (Math.sin(heartbeatCycle) + 0.5 * Math.sin(heartbeatCycle * 2)) // double-pulse
    : 1;
  // Glow intensity: strong during active, subtle during idle
  const glowIntensity = isActivePhase
    ? 0.6 + 0.4 * Math.abs(Math.sin(heartbeatCycle))
    : 0.2;

  // Long press detection
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    setHasMoved(false);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    // Start long press timer
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      onLongPress();
    }, 600);
  }, [position, onLongPress]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const newX = Math.max(0, Math.min(window.innerWidth - 200, e.clientX - dragStart.x));
    const newY = Math.max(0, Math.min(window.innerHeight - 200, e.clientY - dragStart.y));
    setPosition({ x: newX, y: newY });
    setHasMoved(true);
    // Cancel long press if dragging
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
  }, [isDragging, dragStart]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    // Cancel long press
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
    // Single tap
    if (!hasMoved) {
      onClick();
    }
  }, [hasMoved, onClick]);

  return (
    <div
      ref={logoRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="fixed z-40 cursor-grab active:cursor-grabbing select-none touch-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: "200px",
        height: "200px",
        transform: `scale(${heartbeat})`,
        transition: isDragging ? "none" : "transform 0.3s ease",
      }}
      role="button"
      aria-label="Open Sous Chef AI — drag to move"
    >
      <div
        className="relative h-full w-full rounded-3xl overflow-hidden"
        style={{
          border: `2.5px solid ${glowStyle.border}`,
          boxShadow: glowStyle.shadow.replace(/60/g, `${Math.round(glowIntensity * 99)}`),
          transition: "border-color 0.8s ease, box-shadow 0.8s ease",
        }}
      >
        <img
          src="/chef-logo.png"
          alt="Sous Chef AI"
          className="h-full w-full object-cover pointer-events-none"
          draggable={false}
        />

        {/* Inner glow overlay */}
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, ${glowStyle.bg} 0%, transparent 70%)`,
            opacity: glowIntensity,
            transition: "background 0.8s ease, opacity 0.3s ease",
          }}
        />

        {/* Notification label */}
        {currentNotification && (
          <div
            className="absolute bottom-2 left-2 right-2 rounded-xl px-2.5 py-1.5 backdrop-blur-md"
            style={{ background: glowStyle.bg, borderTop: `1px solid ${glowStyle.border}40` }}
          >
            <p className="text-[9px] font-bold text-white/90 truncate">
              {glowStyle.label}
            </p>
            <p className="text-[8px] text-white/60 truncate">
              {currentNotification.message}
            </p>
          </div>
        )}

        {/* Idle state: tap to talk + chat button */}
        {!currentNotification && !voiceActive && (
          <>
            <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-[#0d1117]/80 px-2 py-1 backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-[#31a8ff] animate-pulse shadow-[0_0_4px_#31a8ff]" />
              <span className="text-[9px] font-medium text-[#e6edf3]">Tap to talk</span>
            </span>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onLongPress(); }}
              className="absolute top-2 right-2 rounded-full bg-[#0d1117]/80 px-2.5 py-1 backdrop-blur-sm text-[9px] font-bold text-[#31a8ff] hover:bg-[#31a8ff]/20 transition-colors border border-[#31a8ff]/30"
            >
              Chat ↗
            </button>
          </>
        )}

        {/* Voice active — Siri-style listening indicator */}
        {voiceActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-[#31a8ff]/20 backdrop-blur-sm border-2 border-[#31a8ff] shadow-[0_0_30px_#31a8ff60]">
            <div className="flex items-center gap-1">
              <span className="h-4 w-1 rounded-full bg-[#31a8ff] animate-pulse" style={{ animationDelay: "0ms" }} />
              <span className="h-6 w-1 rounded-full bg-[#31a8ff] animate-pulse" style={{ animationDelay: "100ms" }} />
              <span className="h-8 w-1 rounded-full bg-[#31a8ff] animate-pulse" style={{ animationDelay: "200ms" }} />
              <span className="h-6 w-1 rounded-full bg-[#31a8ff] animate-pulse" style={{ animationDelay: "300ms" }} />
              <span className="h-4 w-1 rounded-full bg-[#31a8ff] animate-pulse" style={{ animationDelay: "400ms" }} />
            </div>
            {liveTranscript ? (
              <p className="mt-3 px-3 text-center text-[11px] font-medium text-white leading-tight max-h-16 overflow-hidden">"{liveTranscript}"</p>
            ) : (
              <span className="mt-3 text-[11px] font-bold text-white">Actively listening...</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
