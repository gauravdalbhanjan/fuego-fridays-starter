/**
 * Central state management hook for PantryPilot.
 * Wraps localStorage persistence with React state.
 */

import { useState, useCallback, useEffect } from "react";
import type {
  PantryItem,
  Purchase,
  Receipt,
  ConsumptionStat,
  ReorderItem,
  ReceiptLineItem,
} from "@/types";
import * as storage from "@/services/storage";
import {
  calculateConsumptionStats,
  predictOutDates,
  generateReorderList,
} from "@/services/predictions";

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function usePantryStore() {
  const [pantryItems, setPantryItems] = useState<PantryItem[]>(
    storage.getPantryItems,
  );
  const [purchases, setPurchases] = useState<Purchase[]>(storage.getPurchases);
  const [receipts, setReceipts] = useState<Receipt[]>(storage.getReceipts);
  const [consumptionStats, setConsumptionStats] = useState<ConsumptionStat[]>(
    storage.getConsumptionStats,
  );

  // Persist on changes
  useEffect(() => {
    storage.savePantryItems(pantryItems);
  }, [pantryItems]);

  useEffect(() => {
    storage.savePurchases(purchases);
  }, [purchases]);

  useEffect(() => {
    storage.saveConsumptionStats(consumptionStats);
  }, [consumptionStats]);

  /** Add items from a parsed receipt to pantry and purchase history */
  const addReceiptItems = useCallback(
    (items: ReceiptLineItem[], storeName: string, date: string) => {
      const receiptId = generateId();
      const total = items.reduce((sum, i) => sum + i.price, 0);

      // Create receipt record
      const receipt: Receipt = {
        id: receiptId,
        uploadDate: date,
        storeName,
        items,
        totalAmount: Math.round(total * 100) / 100,
      };
      storage.addReceipt(receipt);
      setReceipts((prev) => [...prev, receipt]);

      // Create purchases and update pantry
      const newPurchases: Purchase[] = [];
      const updatedPantry = [...pantryItems];

      for (const lineItem of items) {
        const purchaseId = generateId();
        const normalizedName = lineItem.name.toLowerCase().trim();

        // Find existing pantry item
        const existingIdx = updatedPantry.findIndex(
          (p) => p.name.toLowerCase().trim() === normalizedName,
        );

        if (existingIdx >= 0) {
          // Update existing item
          updatedPantry[existingIdx] = {
            ...updatedPantry[existingIdx],
            quantity: lineItem.quantity,
            lastPurchased: date,
            brand: lineItem.brand || updatedPantry[existingIdx].brand,
            purchaseCount: updatedPantry[existingIdx].purchaseCount + 1,
          };

          newPurchases.push({
            id: purchaseId,
            itemId: updatedPantry[existingIdx].id,
            itemName: lineItem.name,
            brand: lineItem.brand,
            size: lineItem.unit,
            quantity: lineItem.quantity,
            unit: lineItem.unit,
            price: lineItem.price,
            date,
            receiptId,
          });
        } else {
          // Create new pantry item
          const itemId = generateId();
          updatedPantry.push({
            id: itemId,
            name: lineItem.name,
            brand: lineItem.brand,
            quantity: lineItem.quantity,
            unit: lineItem.unit,
            category: lineItem.category,
            lastPurchased: date,
            confidence: 0.3,
            isStaple: false,
            purchaseCount: 1,
          });

          newPurchases.push({
            id: purchaseId,
            itemId,
            itemName: lineItem.name,
            brand: lineItem.brand,
            size: lineItem.unit,
            quantity: lineItem.quantity,
            unit: lineItem.unit,
            price: lineItem.price,
            date,
            receiptId,
          });
        }
      }

      setPantryItems(updatedPantry);
      const allPurchases = [...purchases, ...newPurchases];
      setPurchases(allPurchases);
      storage.addPurchases(newPurchases);

      // Recalculate consumption stats
      const newStats = calculateConsumptionStats(allPurchases);
      setConsumptionStats(newStats);

      // Update predictions
      const predicted = predictOutDates(updatedPantry, newStats);
      setPantryItems(predicted);
    },
    [pantryItems, purchases],
  );

  /** Update a pantry item */
  const updatePantryItem = useCallback(
    (id: string, updates: Partial<PantryItem>) => {
      setPantryItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updates } : item)),
      );
    },
    [],
  );

  /** Remove a pantry item */
  const removePantryItem = useCallback((id: string) => {
    setPantryItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  /** Get reorder list */
  const getReorderList = useCallback((): ReorderItem[] => {
    return generateReorderList(pantryItems, consumptionStats);
  }, [pantryItems, consumptionStats]);

  /** Record feedback when user edits a reorder list */
  const recordFeedback = useCallback(
    (original: ReorderItem[], final: ReorderItem[]) => {
      const feedback = {
        id: generateId(),
        date: new Date().toISOString(),
        originalItems: original,
        finalItems: final,
        removedCount: original.filter(
          (o) => !final.find((f) => f.itemId === o.itemId && f.included),
        ).length,
        addedCount: final.filter(
          (f) =>
            f.included && !original.find((o) => o.itemId === f.itemId),
        ).length,
      };
      storage.addFeedback(feedback);
    },
    [],
  );

  /** Clear all data (reset) */
  const resetAll = useCallback(() => {
    storage.clearAllData();
    setPantryItems([]);
    setPurchases([]);
    setReceipts([]);
    setConsumptionStats([]);
  }, []);

  return {
    pantryItems,
    purchases,
    receipts,
    consumptionStats,
    addReceiptItems,
    updatePantryItem,
    removePantryItem,
    getReorderList,
    recordFeedback,
    resetAll,
  };
}
