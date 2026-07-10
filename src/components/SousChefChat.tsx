import { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Send,
  Camera,
  CameraOff,
  Sparkles,
  ChefHat,
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
}

export function SousChefChat({ lowStockCount }: SousChefChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<SousChefState>(loadSousChefState);
  const [input, setInput] = useState("");
  const [detectedMood, setDetectedMood] = useState<UserMood | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Floating action button (closed state)
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30 transition-transform hover:scale-110 active:scale-95"
        aria-label="Open Sous Chef"
      >
        <ChefHat className="h-7 w-7" />
        {/* Notification dot */}
        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[8px] font-bold">
          AI
        </span>
      </button>
    );
  }

  // Chat panel (open state)
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600">
          <ChefHat className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-white">Sous Chef AI</p>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[11px] text-white/50">
              {state.cameraActive
                ? `Reading your vibe... ${detectedMood ? `(${detectedMood.expression})` : ""}`
                : "Always here to help"}
            </span>
          </div>
        </div>

        {/* Camera toggle */}
        <button
          onClick={toggleCamera}
          className={cn(
            "rounded-full p-2 transition-all",
            state.cameraActive
              ? "bg-green-500/20 text-green-400"
              : "bg-white/10 text-white/50 hover:text-white/80",
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
          className="rounded-full bg-white/10 p-2 text-white/60 hover:text-white"
          aria-label="Close chat"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {/* Camera preview (when active) */}
      {state.cameraActive && (
        <div className="border-b border-white/10 bg-[#1a1a1a] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-green-900 to-green-700">
              <Camera className="h-6 w-6 text-green-300 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-medium text-green-400">Camera Active</p>
              {detectedMood && (
                <div className="mt-1 space-y-0.5">
                  <p className="text-[11px] text-white/60">
                    Expression: <span className="text-white">{detectedMood.expression}</span>
                  </p>
                  <p className="text-[11px] text-white/60">
                    Energy: <span className="text-white">{detectedMood.energy}</span>
                  </p>
                  <p className="text-[11px] text-white/60">
                    Confidence: <span className="text-white">{Math.round(detectedMood.confidence * 100)}%</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        {state.messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Typing indicator */}
        {state.isTyping && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20">
              <ChefHat className="h-4 w-4 text-amber-400" />
            </div>
            <div className="flex gap-1 rounded-2xl bg-white/10 px-4 py-3">
              <span className="h-2 w-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-2 w-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-2 w-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>

      {/* Quick replies */}
      <div className="border-t border-white/5 px-4 py-2">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {quickReplies.map((reply) => (
            <button
              key={reply}
              onClick={() => {
                setInput(reply);
                setTimeout(() => handleSend(), 50);
              }}
              className="shrink-0 rounded-full border border-white/15 px-3 py-1.5 text-[11px] text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            >
              {reply}
            </button>
          ))}
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center rounded-full bg-white/10 px-4 py-2.5">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Talk to your sous chef..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
            />
            <Sparkles className="h-4 w-4 text-amber-400/60" />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full transition-all",
              input.trim()
                ? "bg-amber-500 text-black hover:bg-amber-400"
                : "bg-white/10 text-white/30",
            )}
            aria-label="Send message"
          >
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
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
          <ChefHat className="h-4 w-4 text-amber-400" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5",
          isChef
            ? "bg-white/10 text-white"
            : "bg-amber-500 text-black",
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
            <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-medium">
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
