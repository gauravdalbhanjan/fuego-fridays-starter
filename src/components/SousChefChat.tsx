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

interface SousChefChatProps {
  lowStockCount: number;
  robinSleepTimeout?: number;
  robinVoiceEnabled?: boolean;
  voiceKey?: string;
}

export function SousChefChat({ lowStockCount, robinSleepTimeout = 10, voiceKey = "Space" }: SousChefChatProps) {
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

  // Process voice commands
  const processVoiceCommand = useCallback((transcript: string) => {
    const t = transcript.toLowerCase().trim();
    // Strip common prefixes: "go to", "open", "show me", "navigate to"
    const stripped = t.replace(/^(go\s*to|open|show\s*me|navigate\s*to|switch\s*to|take\s*me\s*to)\s+/i, "").replace(/\s*page$/i, "").trim();
    let response = "";

    if (stripped.includes("chat") || (t.includes("open") && t.includes("chat"))) {
      response = "Opening chat.";
      setIsOpen(true);
      setMiniChatOpen(false);
    } else if (stripped.includes("menu") || stripped.includes("food") || stripped.includes("cook") || stripped.includes("dish") || stripped.includes("recipe")) {
      response = "Opening menu.";
      window.dispatchEvent(new CustomEvent("robin-navigate", { detail: "menu" }));
    } else if (stripped.includes("inventory") || stripped.includes("pantry") || stripped.includes("stock") || stripped.includes("groceries") || stripped.includes("items")) {
      response = "Opening inventory.";
      window.dispatchEvent(new CustomEvent("robin-navigate", { detail: "inventory" }));
    } else if (stripped.includes("routine") || stripped.includes("schedule") || stripped.includes("meal plan") || stripped.includes("daily")) {
      response = "Opening routine.";
      window.dispatchEvent(new CustomEvent("robin-navigate", { detail: "routine" }));
    } else if (stripped.includes("alexa") || stripped.includes("order") || stripped.includes("amazon") || stripped.includes("delivery") || stripped.includes("restock")) {
      response = "Opening orders.";
      window.dispatchEvent(new CustomEvent("robin-navigate", { detail: "events" }));
    } else if (stripped.includes("setting") || stripped.includes("config") || stripped.includes("preference")) {
      response = "Opening settings.";
      window.dispatchEvent(new CustomEvent("robin-navigate", { detail: "settings" }));
    } else if (stripped.includes("cart") || stripped.includes("basket")) {
      response = "Opening cart.";
      window.dispatchEvent(new CustomEvent("robin-navigate", { detail: "cart" }));
    } else if (t.includes("light mode") || t.includes("light theme") || t.includes("turn on lights")) {
      response = "Switching to light mode.";
      window.dispatchEvent(new CustomEvent("robin-theme", { detail: "light" }));
    } else if (t.includes("dark mode") || t.includes("dark theme") || t.includes("turn off lights")) {
      response = "Switching to dark mode.";
      window.dispatchEvent(new CustomEvent("robin-theme", { detail: "dark" }));
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
      setTimeout(() => { setMiniChatOpen(false); setMiniMessage(""); }, robinSleepTimeout * 1000);
    }
  }, [robinSleepTimeout]);

  /**
   * SPACEBAR HOLD TO TALK + 10s SESSION
   * 
   * - Hold spacebar → activates listening (green dot)
   * - Release spacebar → processes command
   * - After processing, stays awake for 10 seconds for next command
   * - If no command in 10s → goes back to sleep
   * - Tap button also starts a session
   * - During active session, any speech is processed as a command
   */
  const voiceActiveRef = useRef(voiceActive);
  useEffect(() => { voiceActiveRef.current = voiceActive; }, [voiceActive]);
  const processRef = useRef(processVoiceCommand);
  useEffect(() => { processRef.current = processVoiceCommand; }, [processVoiceCommand]);
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sessionActive, setSessionActive] = useState(false); // 10s window after command
  const sessionActiveRef = useRef(false);
  useEffect(() => { sessionActiveRef.current = sessionActive; }, [sessionActive]);

  // Start a listening session (recognizes one command, then stays awake 10s)
  const startSession = useCallback(() => {
    const SpeechRecognitionCtor = window.SpeechRecognition || (window as unknown as { webkitSpeechRecognition: typeof window.SpeechRecognition }).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;
    if (voiceActiveRef.current) return;

    setVoiceActive(true);
    setSessionActive(true);
    setLiveTranscript("");

    // Clear any existing sleep timer
    if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);

    const rec = new SpeechRecognitionCtor();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    let acted = false;

    rec.onresult = (event: SpeechRecognitionEvent) => {
      if (acted) return;
      let interim = "";
      let finalText = "";
      for (let i = 0; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += t;
        else interim += t;
      }
      const display = finalText || interim;
      const cleaned = display.toLowerCase()
        .replace(/hey\s*g\b/g, "").replace(/hey\s*robin/g, "")
        .replace(/\brobin\b/g, "").replace(/\brobyn\b/g, "")
        .replace(/\bg\b/g, "").trim();
      setLiveTranscript(cleaned || display);

      // Quick match on interim
      if (!finalText && interim && cleaned.length > 3) {
        const match = ["menu","inventory","routine","alexa","order","cart","setting","pantry","cook","recipe","groceries","daily","stock"].some(w => cleaned.includes(w));
        if (match) {
          acted = true;
          rec.stop();
          processRef.current(cleaned);
          setLiveTranscript("");
          setVoiceActive(false);
          // Stay awake for 10s, then auto-listen again
          scheduleNextListen();
          return;
        }
      }

      if (finalText) {
        acted = true;
        setLiveTranscript("");
        if (cleaned.length > 0) processRef.current(cleaned);
        setVoiceActive(false);
        scheduleNextListen();
      }
    };

    rec.onerror = () => {
      setVoiceActive(false);
      setLiveTranscript("");
      // If session still active, try again
      if (sessionActiveRef.current) scheduleNextListen();
    };

    rec.onend = () => {
      if (!acted) {
        setVoiceActive(false);
        setLiveTranscript("");
        if (sessionActiveRef.current) scheduleNextListen();
      }
    };

    try { rec.start(); } catch { setVoiceActive(false); }
  }, []);

  // Schedule the next listen within the 10s session window
  const scheduleNextListen = useCallback(() => {
    // Start listening again after a brief pause
    setTimeout(() => {
      if (sessionActiveRef.current) {
        startSession();
      }
    }, 500);

    // Set 10s sleep timer — if no new command, session ends
    if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    sessionTimerRef.current = setTimeout(() => {
      setSessionActive(false);
      setVoiceActive(false);
      setLiveTranscript("");
      setMiniMessage("");
    }, 10000);
  }, []);

  // Spacebar hold to talk
  useEffect(() => {
    let keyHeld = false;

    function onKeyDown(e: KeyboardEvent) {
      if (e.code === voiceKey && !keyHeld && !e.repeat) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        keyHeld = true;
        if (!sessionActiveRef.current) {
          startSession();
        }
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.code === voiceKey && keyHeld) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        keyHeld = false;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [voiceKey]);

  // Tap button also starts session
  const listenForOneCommand = useCallback(() => {
    startSession();
  }, [startSession]);

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

  // Floating logo — like Siri: TAP to listen, that's it
  if (!isOpen) {
    return (
      <>
        {/* The Robin button — fixed position, just tap it */}
        <div className="fixed top-4 right-4 z-40" style={{ width: "80px", height: "80px" }}>
          <button
            onClick={listenForOneCommand}
            className="relative h-full w-full rounded-full overflow-hidden border-2 border-[#30363d] shadow-xl transition-transform active:scale-90 focus:outline-none"
            style={{
              borderColor: voiceActive ? "#3fb950" : "#30363d",
              boxShadow: voiceActive ? "0 0 20px #3fb950, 0 0 40px #3fb95040" : "0 4px 20px rgba(0,0,0,0.5)",
            }}
            aria-label="Tap to talk to Robin"
          >
            <img src="/chef-logo.png" alt="Robin" className="h-full w-full object-cover" draggable={false} />

            {/* Green mic indicator */}
            <span
              className="absolute top-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-[#0d1117]"
              style={{ background: voiceActive ? "#3fb950" : sessionActive ? "#f0c000" : "#484f58", boxShadow: voiceActive ? "0 0 6px #3fb950" : sessionActive ? "0 0 6px #f0c000" : "none" }}
            />

            {/* Listening overlay */}
            {voiceActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#31a8ff]/30 backdrop-blur-sm">
                <div className="flex items-center gap-0.5">
                  <span className="h-3 w-0.5 rounded-full bg-white animate-pulse" />
                  <span className="h-4 w-0.5 rounded-full bg-white animate-pulse" style={{ animationDelay: "100ms" }} />
                  <span className="h-5 w-0.5 rounded-full bg-white animate-pulse" style={{ animationDelay: "200ms" }} />
                  <span className="h-4 w-0.5 rounded-full bg-white animate-pulse" style={{ animationDelay: "300ms" }} />
                  <span className="h-3 w-0.5 rounded-full bg-white animate-pulse" style={{ animationDelay: "400ms" }} />
                </div>
              </div>
            )}
          </button>

          {/* Live transcript below the button */}
          {voiceActive && liveTranscript && (
            <div className="absolute top-full mt-2 right-0 w-48 rounded-xl bg-[#161b22] border border-[#30363d] px-3 py-2 shadow-lg">
              <p className="text-[11px] text-[#e6edf3] leading-tight">"{liveTranscript}"</p>
            </div>
          )}
          {voiceActive && !liveTranscript && (
            <div className="absolute top-full mt-2 right-0 rounded-xl bg-[#161b22] border border-[#30363d] px-3 py-2 shadow-lg">
              <p className="text-[11px] text-[#3fb950] font-medium">Listening...</p>
            </div>
          )}
          {!voiceActive && sessionActive && (
            <div className="absolute top-full mt-2 right-0 rounded-xl bg-[#161b22] border border-[#f0c000]/30 px-3 py-2 shadow-lg">
              <p className="text-[11px] text-[#f0c000] font-medium">Ready for next command...</p>
              <p className="text-[9px] text-[#8b949e]">Spacebar or speak</p>
            </div>
          )}

          {/* Chat button */}
          {!voiceActive && (
            <button
              onClick={() => setIsOpen(true)}
              className="absolute -bottom-1 -left-1 rounded-full bg-[#161b22] border border-[#30363d] px-2 py-0.5 text-[8px] font-bold text-[#31a8ff] hover:bg-[#31a8ff]/10"
            >
              Chat
            </button>
          )}
        </div>

        {/* Mini response bubble */}
        {miniChatOpen && (
          <div className="fixed top-24 right-4 z-40 w-64 rounded-2xl bg-[#161b22] border border-[#30363d] px-4 py-3 shadow-2xl">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-[#31a8ff]">Robin</span>
              <button onClick={() => { setMiniChatOpen(false); setMiniMessage(""); }} className="text-[#8b949e] text-xs hover:text-white">✕</button>
            </div>
            <p className="text-[12px] text-[#e6edf3] leading-relaxed">{miniMessage}</p>
          </div>
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

/* ─── Draggable Logo with Notification Glow ─── */
// REMOVED — replaced by simple fixed button in SousChefChat render
