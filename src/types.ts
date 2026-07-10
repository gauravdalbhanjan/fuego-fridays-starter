/** PantryPilot — Core data models */

export interface PantryItem {
  id: string;
  name: string;
  brand?: string;
  size?: string;
  quantity: number;
  unit: string;
  category: string;
  lastPurchased: string; // ISO date
  predictedOutDate?: string; // ISO date
  consumptionRateDays?: number; // avg days between purchases
  confidence: number; // 0-1, prediction confidence
  isStaple: boolean; // consistently rebought
  purchaseCount: number;
}

export interface Purchase {
  id: string;
  itemId: string;
  itemName: string;
  brand?: string;
  size?: string;
  quantity: number;
  unit: string;
  price: number;
  date: string; // ISO date
  receiptId: string;
}

export interface Receipt {
  id: string;
  uploadDate: string; // ISO date
  storeName?: string;
  items: ReceiptLineItem[];
  totalAmount: number;
}

export interface ReceiptLineItem {
  name: string;
  brand?: string;
  quantity: number;
  unit: string;
  price: number;
  category: string;
}

export interface ConsumptionStat {
  itemId: string;
  itemName: string;
  avgIntervalDays: number;
  purchaseDates: string[]; // ISO dates
  preferredBrand?: string;
  preferredSize?: string;
  confidence: number;
  isStaple: boolean;
}

export interface ReorderItem {
  itemId: string;
  name: string;
  brand?: string;
  quantity: number;
  unit: string;
  urgency: "critical" | "soon" | "upcoming";
  predictedOutDate: string;
  confidence: number;
  included: boolean; // user can toggle
}

export interface PredictionFeedback {
  id: string;
  date: string;
  originalItems: ReorderItem[];
  finalItems: ReorderItem[];
  removedCount: number;
  addedCount: number;
}

export type StockStatus = "in-stock" | "running-low" | "out-of-stock";

export interface DeliveryService {
  name: string;
  id: string;
  buildCartUrl: (items: ReorderItem[]) => string;
}
