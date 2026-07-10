/**
 * Prediction engine — calculates consumption rates and predicts restock dates.
 */

import type {
  PantryItem,
  Purchase,
  ConsumptionStat,
  ReorderItem,
  StockStatus,
} from "@/types";

/**
 * Calculate consumption stats from purchase history.
 * Groups purchases by item name, computes average interval between purchases.
 */
export function calculateConsumptionStats(
  purchases: Purchase[],
): ConsumptionStat[] {
  // Group purchases by normalized item name
  const grouped = new Map<string, Purchase[]>();
  for (const p of purchases) {
    const key = p.itemName.toLowerCase().trim();
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(p);
  }

  const stats: ConsumptionStat[] = [];

  for (const [, itemPurchases] of grouped) {
    if (itemPurchases.length < 1) continue;

    // Sort by date ascending
    const sorted = [...itemPurchases].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const purchaseDates = sorted.map((p) => p.date);

    // Calculate intervals between consecutive purchases
    let avgIntervalDays = 14; // default assumption
    if (sorted.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < sorted.length; i++) {
        const diff =
          (new Date(sorted[i].date).getTime() -
            new Date(sorted[i - 1].date).getTime()) /
          (1000 * 60 * 60 * 24);
        intervals.push(diff);
      }
      avgIntervalDays =
        intervals.reduce((a, b) => a + b, 0) / intervals.length;
    }

    // Detect preferred brand (most frequent)
    const brandCounts = new Map<string, number>();
    for (const p of sorted) {
      if (p.brand) {
        brandCounts.set(p.brand, (brandCounts.get(p.brand) || 0) + 1);
      }
    }
    let preferredBrand: string | undefined;
    let maxBrandCount = 0;
    for (const [brand, count] of brandCounts) {
      if (count > maxBrandCount) {
        maxBrandCount = count;
        preferredBrand = brand;
      }
    }

    // Detect preferred size
    const sizeCounts = new Map<string, number>();
    for (const p of sorted) {
      if (p.size) {
        sizeCounts.set(p.size, (sizeCounts.get(p.size) || 0) + 1);
      }
    }
    let preferredSize: string | undefined;
    let maxSizeCount = 0;
    for (const [size, count] of sizeCounts) {
      if (count > maxSizeCount) {
        maxSizeCount = count;
        preferredSize = size;
      }
    }

    // Confidence: higher with more data points and consistent intervals
    const dataPoints = Math.min(sorted.length / 5, 1); // max at 5 purchases
    const consistency =
      sorted.length >= 2 ? calculateConsistency(sorted) : 0.3;
    const confidence = Math.round(dataPoints * 0.6 + consistency * 0.4);

    // Staple: bought 3+ times
    const isStaple = sorted.length >= 3;

    stats.push({
      itemId: sorted[0].itemId,
      itemName: sorted[0].itemName,
      avgIntervalDays: Math.round(avgIntervalDays * 10) / 10,
      purchaseDates,
      preferredBrand,
      preferredSize,
      confidence: Math.min(confidence, 1),
      isStaple,
    });
  }

  return stats;
}

/** Measure how consistent purchase intervals are (0 = erratic, 1 = clockwork) */
function calculateConsistency(sorted: Purchase[]): number {
  if (sorted.length < 3) return 0.5;

  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const diff =
      (new Date(sorted[i].date).getTime() -
        new Date(sorted[i - 1].date).getTime()) /
      (1000 * 60 * 60 * 24);
    intervals.push(diff);
  }

  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance =
    intervals.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) /
    intervals.length;
  const stdDev = Math.sqrt(variance);

  // Coefficient of variation — lower means more consistent
  const cv = mean > 0 ? stdDev / mean : 1;
  // Map CV to a 0-1 score (CV of 0 = 1.0 score, CV >= 1 = 0.0 score)
  return Math.max(0, Math.min(1, 1 - cv));
}

/**
 * Predict when each pantry item will run out, based on consumption stats.
 */
export function predictOutDates(
  pantryItems: PantryItem[],
  stats: ConsumptionStat[],
): PantryItem[] {
  return pantryItems.map((item) => {
    const stat = stats.find(
      (s) => s.itemName.toLowerCase() === item.name.toLowerCase(),
    );

    if (!stat || !item.lastPurchased) return item;

    const lastPurchase = new Date(item.lastPurchased);
    const daysToConsume = stat.avgIntervalDays;
    const predictedOut = new Date(
      lastPurchase.getTime() + daysToConsume * 24 * 60 * 60 * 1000,
    );

    return {
      ...item,
      consumptionRateDays: stat.avgIntervalDays,
      predictedOutDate: predictedOut.toISOString().split("T")[0],
      confidence: stat.confidence,
      isStaple: stat.isStaple,
    };
  });
}

/**
 * Get stock status for a pantry item based on prediction.
 */
export function getStockStatus(item: PantryItem): StockStatus {
  if (!item.predictedOutDate) return "in-stock";

  const now = new Date();
  const outDate = new Date(item.predictedOutDate);
  const daysRemaining =
    (outDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  if (daysRemaining <= 0) return "out-of-stock";
  if (daysRemaining <= 3) return "running-low";
  return "in-stock";
}

/**
 * Generate reorder list from pantry items predicted to be low/out.
 */
export function generateReorderList(
  pantryItems: PantryItem[],
  stats: ConsumptionStat[],
): ReorderItem[] {
  const today = new Date();
  const updatedItems = predictOutDates(pantryItems, stats);

  const reorderItems: ReorderItem[] = [];

  for (const item of updatedItems) {
    if (!item.predictedOutDate) continue;

    const outDate = new Date(item.predictedOutDate);
    const daysRemaining =
      (outDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

    // Only suggest items that are running low or predicted to soon
    if (daysRemaining <= 7) {
      let urgency: "critical" | "soon" | "upcoming";
      if (daysRemaining <= 0) urgency = "critical";
      else if (daysRemaining <= 3) urgency = "soon";
      else urgency = "upcoming";

      reorderItems.push({
        itemId: item.id,
        name: item.name,
        brand: item.brand,
        quantity: item.quantity,
        unit: item.unit,
        urgency,
        predictedOutDate: item.predictedOutDate,
        confidence: item.confidence,
        included: true,
      });
    }
  }

  // Sort by urgency: critical > soon > upcoming
  const urgencyOrder = { critical: 0, soon: 1, upcoming: 2 };
  return reorderItems.sort(
    (a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency],
  );
}
