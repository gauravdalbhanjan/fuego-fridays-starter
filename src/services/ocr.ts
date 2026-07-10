/**
 * Mock OCR service — simulates receipt parsing.
 * In production, this would call a real OCR API (Google Vision, Veryfi, etc.)
 */

import type { ReceiptLineItem } from "@/types";

/** Simulated delay for "processing" */
const PROCESSING_DELAY_MS = 1500;

/** Sample receipt items for demonstration */
const SAMPLE_RECEIPTS: ReceiptLineItem[][] = [
  [
    { name: "Whole Milk", brand: "Organic Valley", quantity: 1, unit: "gal", price: 5.99, category: "Dairy" },
    { name: "Large Eggs", brand: "Happy Egg Co", quantity: 1, unit: "dozen", price: 4.49, category: "Dairy" },
    { name: "Sourdough Bread", brand: "Dave's Killer", quantity: 1, unit: "loaf", price: 5.99, category: "Bakery" },
    { name: "Bananas", brand: "", quantity: 6, unit: "ct", price: 1.89, category: "Produce" },
    { name: "Avocados", brand: "", quantity: 3, unit: "ct", price: 4.50, category: "Produce" },
    { name: "Chicken Breast", brand: "Bell & Evans", quantity: 2, unit: "lb", price: 11.98, category: "Meat" },
    { name: "Greek Yogurt", brand: "Fage", quantity: 4, unit: "ct", price: 6.99, category: "Dairy" },
    { name: "Olive Oil", brand: "California Olive Ranch", quantity: 1, unit: "bottle", price: 9.99, category: "Pantry" },
  ],
  [
    { name: "Whole Milk", brand: "Organic Valley", quantity: 1, unit: "gal", price: 5.99, category: "Dairy" },
    { name: "Large Eggs", brand: "Happy Egg Co", quantity: 1, unit: "dozen", price: 4.49, category: "Dairy" },
    { name: "Cheddar Cheese", brand: "Tillamook", quantity: 1, unit: "block", price: 5.49, category: "Dairy" },
    { name: "Spinach", brand: "Earthbound", quantity: 1, unit: "bag", price: 3.99, category: "Produce" },
    { name: "Tomatoes", brand: "", quantity: 4, unit: "ct", price: 3.20, category: "Produce" },
    { name: "Pasta", brand: "De Cecco", quantity: 2, unit: "box", price: 3.98, category: "Pantry" },
    { name: "Marinara Sauce", brand: "Rao's", quantity: 1, unit: "jar", price: 8.99, category: "Pantry" },
    { name: "Coffee Beans", brand: "Counter Culture", quantity: 1, unit: "bag", price: 14.99, category: "Beverages" },
    { name: "Bananas", brand: "", quantity: 5, unit: "ct", price: 1.59, category: "Produce" },
  ],
  [
    { name: "Whole Milk", brand: "Organic Valley", quantity: 1, unit: "gal", price: 5.99, category: "Dairy" },
    { name: "Large Eggs", brand: "Happy Egg Co", quantity: 2, unit: "dozen", price: 8.98, category: "Dairy" },
    { name: "Sourdough Bread", brand: "Dave's Killer", quantity: 1, unit: "loaf", price: 5.99, category: "Bakery" },
    { name: "Bananas", brand: "", quantity: 7, unit: "ct", price: 2.09, category: "Produce" },
    { name: "Chicken Breast", brand: "Bell & Evans", quantity: 3, unit: "lb", price: 17.97, category: "Meat" },
    { name: "Greek Yogurt", brand: "Fage", quantity: 4, unit: "ct", price: 6.99, category: "Dairy" },
    { name: "Almond Butter", brand: "Justin's", quantity: 1, unit: "jar", price: 9.49, category: "Pantry" },
    { name: "Coffee Beans", brand: "Counter Culture", quantity: 1, unit: "bag", price: 14.99, category: "Beverages" },
    { name: "Oat Milk", brand: "Oatly", quantity: 1, unit: "carton", price: 4.99, category: "Dairy" },
  ],
];

let receiptIndex = 0;

export interface OCRResult {
  success: boolean;
  items: ReceiptLineItem[];
  storeName: string;
  total: number;
  date: string;
}

/**
 * Mock OCR: simulates processing a receipt image/PDF.
 * Cycles through sample receipts to simulate different shopping trips.
 */
export async function parseReceipt(_file: File): Promise<OCRResult> {
  // Simulate processing time
  await new Promise((resolve) => setTimeout(resolve, PROCESSING_DELAY_MS));

  const items = SAMPLE_RECEIPTS[receiptIndex % SAMPLE_RECEIPTS.length];
  receiptIndex++;

  const total = items.reduce((sum, item) => sum + item.price, 0);
  const stores = ["Whole Foods Market", "Trader Joe's", "Safeway", "Kroger"];
  const storeName = stores[receiptIndex % stores.length];

  return {
    success: true,
    items: items.map((item) => ({ ...item })), // clone
    storeName,
    total: Math.round(total * 100) / 100,
    date: new Date().toISOString().split("T")[0],
  };
}

/**
 * Manual entry fallback — creates a single line item
 */
export function createManualItem(
  name: string,
  quantity: number,
  unit: string,
  price: number,
  category: string,
  brand?: string,
): ReceiptLineItem {
  return { name, brand, quantity, unit, price, category };
}
