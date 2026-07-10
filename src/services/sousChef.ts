/**
 * Sous Chef AI — The PantryPilot companion.
 * 
 * Simulates an AI sous chef that:
 * 1. Chats with the user conversationally
 * 2. Integrates with camera to read expressions/reactions
 * 3. Learns and adapts to preference changes over time
 * 4. Proactively suggests meals, orders, tips
 * 5. Asks clarifying questions to refine understanding
 */

export interface ChatMessage {
  id: string;
  role: "chef" | "user" | "system";
  content: string;
  timestamp: string;
  mood?: UserMood;
  action?: ChefAction;
}

export interface UserMood {
  expression: "happy" | "neutral" | "tired" | "excited" | "uncertain";
  energy: "high" | "medium" | "low";
  confidence: number;
}

export interface ChefAction {
  type: "suggest_meal" | "add_to_cart" | "reorder" | "ask_preference" | "tip" | "camera_read";
  data?: Record<string, unknown>;
}

export interface PreferenceChange {
  id: string;
  date: string;
  category: string;
  description: string;
  oldValue: string;
  newValue: string;
  confidence: number;
}

export interface SousChefState {
  messages: ChatMessage[];
  isTyping: boolean;
  cameraActive: boolean;
  lastMoodDetected?: UserMood;
  preferenceChanges: PreferenceChange[];
  conversationContext: string[];
}

const STORAGE_KEY = "pantrypilot_souschef";

const CHEF_RESPONSES: Record<string, string[]> = {
  greeting: [
    "Hey! 👋 I'm your sous chef. What are we cooking today?",
    "Good to see you! I noticed your pantry is looking good. Want me to suggest something?",
    "Hi there! I've been keeping an eye on your kitchen — ready when you are.",
  ],
  mood_happy: [
    "You're in a great mood! How about trying something new today? 🎉",
    "Love the energy! Want me to suggest something fun and adventurous?",
  ],
  mood_tired: [
    "Looks like you could use something easy tonight. How about a 10-min meal?",
    "Long day? I've got some super quick options — minimal effort, maximum comfort.",
    "I'll keep it simple for you today. One-pot meals sound good?",
  ],
  mood_uncertain: [
    "Not sure what you want? Let me narrow it down — sweet or savory?",
    "I can help you decide. What sounds better: something light or hearty?",
  ],
  low_stock: [
    "Heads up — I noticed you're running low on a few things. Want me to add them to the next Alexa order?",
    "Quick check-in: some staples are getting low. Should I auto-restock the usual?",
  ],
  preference_change: [
    "I noticed you've been skipping {item} lately. Want me to stop ordering it?",
    "Looks like you're eating more {item} these days. Should I bump up the quantity?",
    "You haven't made {item} in a while — still a favorite or time to switch it up?",
  ],
  meal_suggestion: [
    "Based on what's in your pantry, you could make {dish} — it's {time} mins and {calories} kcal. Sound good?",
    "I'd suggest {dish} tonight. You have most ingredients, and it matches your calorie target.",
  ],
  ask_preference: [
    "Quick question: do you prefer cooking big batches or fresh each day?",
    "I want to get better at suggesting meals. On weeknights, do you prefer under 20 mins or are you okay with 30+?",
    "Are you trying to eat lighter these days, or are you comfortable with your current portions?",
    "I've noticed you order {item} every week. Is that a household essential or just for you?",
  ],
};

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getInitialMessages(): ChatMessage[] {
  return [
    {
      id: "init-1",
      role: "chef",
      content: pickRandom(CHEF_RESPONSES.greeting),
      timestamp: new Date().toISOString(),
    },
  ];
}

export function generateChefResponse(
  userMessage: string,
  mood?: UserMood,
  _context?: string[],
): ChatMessage {
  const lower = userMessage.toLowerCase();
  let content: string;
  let action: ChefAction | undefined;

  // Context-aware responses
  if (lower.includes("suggest") || lower.includes("what should")) {
    content = pickRandom(CHEF_RESPONSES.meal_suggestion)
      .replace("{dish}", "Agliolio Spaghetti")
      .replace("{time}", "12")
      .replace("{calories}", "550");
    action = { type: "suggest_meal", data: { dishId: "d4" } };
  } else if (lower.includes("tired") || lower.includes("easy") || lower.includes("quick")) {
    content = pickRandom(CHEF_RESPONSES.mood_tired);
    action = { type: "suggest_meal" };
  } else if (lower.includes("order") || lower.includes("buy") || lower.includes("restock")) {
    content = pickRandom(CHEF_RESPONSES.low_stock);
    action = { type: "reorder" };
  } else if (lower.includes("preference") || lower.includes("change") || lower.includes("don't like")) {
    content = "Got it! I'll make a note of that and adjust my future suggestions. What would you prefer instead?";
    action = { type: "ask_preference" };
  } else if (lower.includes("hi") || lower.includes("hello") || lower.includes("hey")) {
    content = pickRandom(CHEF_RESPONSES.greeting);
  } else if (lower.includes("yes") || lower.includes("sure") || lower.includes("sounds good")) {
    content = "Great! I'll set that up for you. Anything else I can help with? 🙌";
  } else if (lower.includes("no") || lower.includes("nah") || lower.includes("not really")) {
    content = "No worries! I'm here whenever you need me. Just say the word.";
  } else {
    // Default: ask a preference question to learn more
    content = pickRandom(CHEF_RESPONSES.ask_preference).replace("{item}", "coffee");
    action = { type: "ask_preference" };
  }

  // Mood-based adjustments
  if (mood?.expression === "tired") {
    content = pickRandom(CHEF_RESPONSES.mood_tired);
  } else if (mood?.expression === "happy" || mood?.expression === "excited") {
    content = pickRandom(CHEF_RESPONSES.mood_happy);
  }

  return {
    id: "chef-" + Date.now(),
    role: "chef",
    content,
    timestamp: new Date().toISOString(),
    action,
  };
}

/**
 * Simulate camera mood detection
 */
export function detectMoodFromCamera(): UserMood {
  const expressions: UserMood["expression"][] = ["happy", "neutral", "tired", "excited", "uncertain"];
  const energies: UserMood["energy"][] = ["high", "medium", "low"];
  return {
    expression: expressions[Math.floor(Math.random() * expressions.length)],
    energy: energies[Math.floor(Math.random() * energies.length)],
    confidence: 0.6 + Math.random() * 0.35,
  };
}

/**
 * Generate a proactive check-in based on time of day and context
 */
export function getProactiveMessage(
  hour: number,
  lowStockCount: number,
): ChatMessage | null {
  if (hour >= 6 && hour < 9) {
    return {
      id: "proactive-" + Date.now(),
      role: "chef",
      content: "Good morning! ☀️ Ready to plan today's meals? I see you have everything for a great breakfast.",
      timestamp: new Date().toISOString(),
      action: { type: "suggest_meal" },
    };
  }
  if (hour >= 11 && hour < 13 && lowStockCount > 0) {
    return {
      id: "proactive-" + Date.now(),
      role: "chef",
      content: `Hey! ${lowStockCount} items are running low. Want me to add them to your next Alexa order?`,
      timestamp: new Date().toISOString(),
      action: { type: "reorder" },
    };
  }
  if (hour >= 16 && hour < 18) {
    return {
      id: "proactive-" + Date.now(),
      role: "chef",
      content: "Dinner time approaching! Based on your pantry and today's vibe, I have a couple suggestions. Want to hear them?",
      timestamp: new Date().toISOString(),
      action: { type: "suggest_meal" },
    };
  }
  return null;
}

export function loadSousChefState(): SousChefState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    messages: getInitialMessages(),
    isTyping: false,
    cameraActive: false,
    preferenceChanges: [],
    conversationContext: [],
  };
}

export function saveSousChefState(state: SousChefState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
