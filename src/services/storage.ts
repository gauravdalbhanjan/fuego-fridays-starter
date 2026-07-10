/** LocalStorage-backed persistence layer for PantryPilot */

import type {
  PantryItem,
  Purchase,
  Receipt,
  ConsumptionStat,
  PredictionFeedback,
} from "@/types";

const KEYS = {
  pantry: "pantrypilot_pantry",
  purchases: "pantrypilot_purchases",
  receipts: "pantrypilot_receipts",
  consumption: "pantrypilot_consumption",
  feedback: "pantrypilot_feedback",
} as const;

function get<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function set<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// Pantry Items
export function getPantryItems(): PantryItem[] {
  return get<PantryItem[]>(KEYS.pantry, []);
}

export function savePantryItems(items: PantryItem[]): void {
  set(KEYS.pantry, items);
}

export function upsertPantryItem(item: PantryItem): void {
  const items = getPantryItems();
  const idx = items.findIndex((i) => i.id === item.id);
  if (idx >= 0) {
    items[idx] = item;
  } else {
    items.push(item);
  }
  savePantryItems(items);
}

// Purchases
export function getPurchases(): Purchase[] {
  return get<Purchase[]>(KEYS.purchases, []);
}

export function savePurchases(purchases: Purchase[]): void {
  set(KEYS.purchases, purchases);
}

export function addPurchases(newPurchases: Purchase[]): void {
  const existing = getPurchases();
  savePurchases([...existing, ...newPurchases]);
}

// Receipts
export function getReceipts(): Receipt[] {
  return get<Receipt[]>(KEYS.receipts, []);
}

export function addReceipt(receipt: Receipt): void {
  const existing = getReceipts();
  set(KEYS.receipts, [...existing, receipt]);
}

// Consumption Stats
export function getConsumptionStats(): ConsumptionStat[] {
  return get<ConsumptionStat[]>(KEYS.consumption, []);
}

export function saveConsumptionStats(stats: ConsumptionStat[]): void {
  set(KEYS.consumption, stats);
}

// Prediction Feedback
export function getFeedback(): PredictionFeedback[] {
  return get<PredictionFeedback[]>(KEYS.feedback, []);
}

export function addFeedback(fb: PredictionFeedback): void {
  const existing = getFeedback();
  set(KEYS.feedback, [...existing, fb]);
}

// Reset all data
export function clearAllData(): void {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}
