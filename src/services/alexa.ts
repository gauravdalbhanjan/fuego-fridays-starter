/**
 * Alexa / Amazon Smart Ordering Integration
 * 
 * This simulates the AI-powered auto-ordering system that:
 * 1. Learns user preferences over time
 * 2. Connects with Alexa for voice-triggered orders
 * 3. Auto-orders fixed items on schedule via Amazon Fresh
 * 4. Adapts based on consumption patterns
 * 
 * In production, this would use:
 * - Alexa Skills Kit (ASK) for voice integration
 * - Amazon SP-API for order placement
 * - Login with Amazon (LWA) for auth
 */

export interface AlexaOrderRule {
  id: string;
  itemName: string;
  itemId: string;
  frequency: "weekly" | "biweekly" | "monthly" | "auto";
  preferredDay: number; // 0-6
  quantity: number;
  unit: string;
  preferredBrand?: string;
  maxPrice?: number;
  enabled: boolean;
  lastOrdered?: string;
  nextOrderDate?: string;
  learnedInterval?: number; // days, learned from usage
  confidenceScore: number; // 0-1, how confident the AI is
}

export interface AlexaConnection {
  connected: boolean;
  accountName?: string;
  defaultAddress?: string;
  preferredService: "amazon-fresh" | "whole-foods" | "amazon-pantry";
  voiceOrderingEnabled: boolean;
  autoOrderEnabled: boolean;
  spendingLimit: number;
  orderHistory: AlexaOrderLog[];
}

export interface AlexaOrderLog {
  id: string;
  date: string;
  items: string[];
  total: number;
  status: "delivered" | "in-transit" | "scheduled" | "cancelled";
  triggeredBy: "auto" | "voice" | "manual";
}

const STORAGE_KEY_RULES = "pantrypilot_alexa_rules";
const STORAGE_KEY_CONNECTION = "pantrypilot_alexa_connection";

// Default connection state (simulated)
const DEFAULT_CONNECTION: AlexaConnection = {
  connected: true,
  accountName: "Home Kitchen",
  defaultAddress: "123 Main St, Apt 4B",
  preferredService: "amazon-fresh",
  voiceOrderingEnabled: true,
  autoOrderEnabled: true,
  spendingLimit: 200,
  orderHistory: [
    {
      id: "ao1",
      date: "2026-07-08",
      items: ["Whole Milk", "Eggs", "Bananas", "Chicken Breast"],
      total: 28.45,
      status: "delivered",
      triggeredBy: "auto",
    },
    {
      id: "ao2",
      date: "2026-07-03",
      items: ["Sourdough", "Greek Yogurt", "Coffee Beans"],
      total: 26.97,
      status: "delivered",
      triggeredBy: "voice",
    },
    {
      id: "ao3",
      date: "2026-06-29",
      items: ["Spinach", "Broccoli", "Tomatoes", "Olive Oil", "Pasta"],
      total: 31.44,
      status: "delivered",
      triggeredBy: "auto",
    },
  ],
};

export function loadAlexaConnection(): AlexaConnection {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONNECTION);
    return raw ? JSON.parse(raw) : DEFAULT_CONNECTION;
  } catch {
    return DEFAULT_CONNECTION;
  }
}

export function saveAlexaConnection(conn: AlexaConnection): void {
  localStorage.setItem(STORAGE_KEY_CONNECTION, JSON.stringify(conn));
}

export function loadAlexaRules(): AlexaOrderRule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RULES);
    return raw ? JSON.parse(raw) : getDefaultRules();
  } catch {
    return getDefaultRules();
  }
}

export function saveAlexaRules(rules: AlexaOrderRule[]): void {
  localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(rules));
}

function getDefaultRules(): AlexaOrderRule[] {
  return [
    { id: "ar1", itemName: "Whole Milk", itemId: "d1", frequency: "auto", preferredDay: 6, quantity: 1, unit: "gal", preferredBrand: "Organic Valley", maxPrice: 7, enabled: true, lastOrdered: "2026-07-08", nextOrderDate: "2026-07-13", learnedInterval: 5, confidenceScore: 0.92 },
    { id: "ar2", itemName: "Eggs", itemId: "m4", frequency: "auto", preferredDay: 6, quantity: 1, unit: "dozen", preferredBrand: "Happy Egg Co", maxPrice: 6, enabled: true, lastOrdered: "2026-07-08", nextOrderDate: "2026-07-13", learnedInterval: 5, confidenceScore: 0.88 },
    { id: "ar3", itemName: "Bananas", itemId: "f2", frequency: "auto", preferredDay: 3, quantity: 6, unit: "ct", enabled: true, lastOrdered: "2026-07-08", nextOrderDate: "2026-07-12", learnedInterval: 4, confidenceScore: 0.85 },
    { id: "ar4", itemName: "Sourdough", itemId: "b1", frequency: "weekly", preferredDay: 6, quantity: 1, unit: "loaf", preferredBrand: "Dave's Killer", maxPrice: 7, enabled: true, lastOrdered: "2026-07-05", nextOrderDate: "2026-07-12", learnedInterval: 5, confidenceScore: 0.9 },
    { id: "ar5", itemName: "Coffee Beans", itemId: "s4", frequency: "biweekly", preferredDay: 6, quantity: 1, unit: "bag", preferredBrand: "Counter Culture", maxPrice: 16, enabled: true, lastOrdered: "2026-07-03", nextOrderDate: "2026-07-17", learnedInterval: 10, confidenceScore: 0.78 },
    { id: "ar6", itemName: "Chicken Breast", itemId: "m1", frequency: "auto", preferredDay: 6, quantity: 2, unit: "lb", preferredBrand: "Bell & Evans", maxPrice: 14, enabled: true, lastOrdered: "2026-07-08", nextOrderDate: "2026-07-13", learnedInterval: 5, confidenceScore: 0.82 },
  ];
}

/**
 * Simulate placing an order through Alexa/Amazon
 */
export function simulateAlexaOrder(
  items: AlexaOrderRule[],
  triggeredBy: "auto" | "voice" | "manual",
): AlexaOrderLog {
  const total = items.reduce((sum, item) => sum + (item.maxPrice || 5) * item.quantity, 0);
  return {
    id: "ao" + Date.now(),
    date: new Date().toISOString().split("T")[0],
    items: items.map((i) => i.itemName),
    total: Math.round(total * 100) / 100,
    status: "scheduled",
    triggeredBy,
  };
}

/**
 * Get items that are due for auto-order today
 */
export function getItemsDueForOrder(rules: AlexaOrderRule[]): AlexaOrderRule[] {
  const today = new Date().toISOString().split("T")[0];
  return rules.filter(
    (rule) => rule.enabled && rule.nextOrderDate && rule.nextOrderDate <= today,
  );
}
