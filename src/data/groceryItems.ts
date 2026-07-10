/**
 * Mock grocery inventory data with consumption patterns.
 * Each item tracks how many dishes it's used in and how many days until it runs out.
 */

export interface GroceryItem {
  id: string;
  name: string;
  category: "Veggies" | "Fruits" | "Meat" | "Staples" | "Breads" | "Dairy" | "Beverages";
  image: string; // emoji as placeholder for product images
  dishesUsedIn: number;
  daysUntilOut: number;
  daysUntilOutLabel: string;
  inCart: boolean;
  autoReorder: boolean;
  urgency: "critical" | "low" | "normal"; // critical = highlighted yellow/orange
  quantity: number;
  unit: string;
  preferredBrand?: string;
  avgConsumptionDays: number; // how often user buys this
  lastPurchased: string; // ISO date
}

export const GROCERY_ITEMS: GroceryItem[] = [
  // Veggies
  { id: "v1", name: "Spinach", category: "Veggies", image: "🥬", dishesUsedIn: 2, daysUntilOut: 2, daysUntilOutLabel: "2 Days", inCart: false, autoReorder: false, urgency: "critical", quantity: 1, unit: "bunch", preferredBrand: "Organic Girl", avgConsumptionDays: 5, lastPurchased: "2026-07-05" },
  { id: "v2", name: "Broccoli", category: "Veggies", image: "🥦", dishesUsedIn: 2, daysUntilOut: 2, daysUntilOutLabel: "2 Days", inCart: false, autoReorder: false, urgency: "critical", quantity: 1, unit: "head", avgConsumptionDays: 5, lastPurchased: "2026-07-05" },
  { id: "v3", name: "Tomatoes", category: "Veggies", image: "🍅", dishesUsedIn: 20, daysUntilOut: 5, daysUntilOutLabel: "5 Days", inCart: false, autoReorder: false, urgency: "low", quantity: 4, unit: "ct", avgConsumptionDays: 7, lastPurchased: "2026-07-03" },
  { id: "v4", name: "Bell Peppers", category: "Veggies", image: "🫑", dishesUsedIn: 3, daysUntilOut: 14, daysUntilOutLabel: "2 Weeks", inCart: false, autoReorder: false, urgency: "normal", quantity: 3, unit: "ct", avgConsumptionDays: 14, lastPurchased: "2026-06-28" },
  { id: "v5", name: "Onion", category: "Veggies", image: "🧅", dishesUsedIn: 20, daysUntilOut: 7, daysUntilOutLabel: "7 Days", inCart: false, autoReorder: false, urgency: "normal", quantity: 3, unit: "ct", avgConsumptionDays: 10, lastPurchased: "2026-07-01" },
  { id: "v6", name: "Carrots", category: "Veggies", image: "🥕", dishesUsedIn: 35, daysUntilOut: 28, daysUntilOutLabel: "4 Weeks", inCart: false, autoReorder: false, urgency: "normal", quantity: 1, unit: "bag", avgConsumptionDays: 21, lastPurchased: "2026-06-20" },
  { id: "v7", name: "Zucchini", category: "Veggies", image: "🥒", dishesUsedIn: 11, daysUntilOut: 7, daysUntilOutLabel: "1 Week", inCart: false, autoReorder: false, urgency: "normal", quantity: 2, unit: "ct", avgConsumptionDays: 10, lastPurchased: "2026-07-02" },

  // Fruits
  { id: "f1", name: "Apple", category: "Fruits", image: "🍎", dishesUsedIn: 2, daysUntilOut: 2, daysUntilOutLabel: "2 Days", inCart: false, autoReorder: false, urgency: "critical", quantity: 6, unit: "ct", avgConsumptionDays: 5, lastPurchased: "2026-07-06" },
  { id: "f2", name: "Banana", category: "Fruits", image: "🍌", dishesUsedIn: 2, daysUntilOut: 2, daysUntilOutLabel: "2 Days", inCart: false, autoReorder: false, urgency: "critical", quantity: 6, unit: "ct", avgConsumptionDays: 4, lastPurchased: "2026-07-06" },
  { id: "f3", name: "Berries", category: "Fruits", image: "🫐", dishesUsedIn: 20, daysUntilOut: 5, daysUntilOutLabel: "5 Days", inCart: false, autoReorder: false, urgency: "low", quantity: 1, unit: "box", preferredBrand: "Driscoll's", avgConsumptionDays: 7, lastPurchased: "2026-07-04" },
  { id: "f4", name: "Oranges", category: "Fruits", image: "🍊", dishesUsedIn: 3, daysUntilOut: 2, daysUntilOutLabel: "2 Days", inCart: false, autoReorder: false, urgency: "critical", quantity: 4, unit: "ct", avgConsumptionDays: 5, lastPurchased: "2026-07-06" },
  { id: "f5", name: "Grapes", category: "Fruits", image: "🍇", dishesUsedIn: 20, daysUntilOut: 7, daysUntilOutLabel: "7 Days", inCart: false, autoReorder: false, urgency: "normal", quantity: 1, unit: "bag", avgConsumptionDays: 10, lastPurchased: "2026-07-02" },

  // Meat
  { id: "m1", name: "Chicken Breast", category: "Meat", image: "🍗", dishesUsedIn: 15, daysUntilOut: 3, daysUntilOutLabel: "3 Days", inCart: false, autoReorder: false, urgency: "critical", quantity: 2, unit: "lb", preferredBrand: "Bell & Evans", avgConsumptionDays: 5, lastPurchased: "2026-07-05" },
  { id: "m2", name: "Ground Beef", category: "Meat", image: "🥩", dishesUsedIn: 8, daysUntilOut: 5, daysUntilOutLabel: "5 Days", inCart: false, autoReorder: false, urgency: "low", quantity: 1, unit: "lb", avgConsumptionDays: 7, lastPurchased: "2026-07-03" },
  { id: "m3", name: "Salmon", category: "Meat", image: "🐟", dishesUsedIn: 5, daysUntilOut: 4, daysUntilOutLabel: "4 Days", inCart: false, autoReorder: false, urgency: "low", quantity: 2, unit: "fillet", avgConsumptionDays: 7, lastPurchased: "2026-07-04" },
  { id: "m4", name: "Eggs", category: "Meat", image: "🥚", dishesUsedIn: 25, daysUntilOut: 3, daysUntilOutLabel: "3 Days", inCart: false, autoReorder: false, urgency: "critical", quantity: 1, unit: "dozen", preferredBrand: "Happy Egg Co", avgConsumptionDays: 5, lastPurchased: "2026-07-05" },

  // Staples
  { id: "s1", name: "Rice", category: "Staples", image: "🍚", dishesUsedIn: 30, daysUntilOut: 14, daysUntilOutLabel: "2 Weeks", inCart: false, autoReorder: false, urgency: "normal", quantity: 1, unit: "bag", preferredBrand: "Jasmine", avgConsumptionDays: 21, lastPurchased: "2026-06-25" },
  { id: "s2", name: "Pasta", category: "Staples", image: "🍝", dishesUsedIn: 12, daysUntilOut: 10, daysUntilOutLabel: "10 Days", inCart: false, autoReorder: false, urgency: "normal", quantity: 2, unit: "box", preferredBrand: "De Cecco", avgConsumptionDays: 14, lastPurchased: "2026-06-28" },
  { id: "s3", name: "Olive Oil", category: "Staples", image: "🫒", dishesUsedIn: 40, daysUntilOut: 21, daysUntilOutLabel: "3 Weeks", inCart: false, autoReorder: false, urgency: "normal", quantity: 1, unit: "bottle", preferredBrand: "California Olive Ranch", avgConsumptionDays: 30, lastPurchased: "2026-06-15" },
  { id: "s4", name: "Coffee Beans", category: "Staples", image: "☕", dishesUsedIn: 0, daysUntilOut: 4, daysUntilOutLabel: "4 Days", inCart: false, autoReorder: false, urgency: "low", quantity: 1, unit: "bag", preferredBrand: "Counter Culture", avgConsumptionDays: 10, lastPurchased: "2026-07-04" },

  // Breads
  { id: "b1", name: "Sourdough", category: "Breads", image: "🍞", dishesUsedIn: 10, daysUntilOut: 2, daysUntilOutLabel: "2 Days", inCart: false, autoReorder: false, urgency: "critical", quantity: 1, unit: "loaf", preferredBrand: "Dave's Killer", avgConsumptionDays: 5, lastPurchased: "2026-07-06" },
  { id: "b2", name: "Tortillas", category: "Breads", image: "🫓", dishesUsedIn: 8, daysUntilOut: 7, daysUntilOutLabel: "1 Week", inCart: false, autoReorder: false, urgency: "normal", quantity: 1, unit: "pack", avgConsumptionDays: 10, lastPurchased: "2026-07-02" },
  { id: "b3", name: "Bagels", category: "Breads", image: "🥯", dishesUsedIn: 5, daysUntilOut: 3, daysUntilOutLabel: "3 Days", inCart: false, autoReorder: false, urgency: "critical", quantity: 6, unit: "ct", avgConsumptionDays: 5, lastPurchased: "2026-07-05" },

  // Dairy
  { id: "d1", name: "Whole Milk", category: "Dairy", image: "🥛", dishesUsedIn: 10, daysUntilOut: 2, daysUntilOutLabel: "2 Days", inCart: false, autoReorder: false, urgency: "critical", quantity: 1, unit: "gal", preferredBrand: "Organic Valley", avgConsumptionDays: 5, lastPurchased: "2026-07-06" },
  { id: "d2", name: "Greek Yogurt", category: "Dairy", image: "🫙", dishesUsedIn: 5, daysUntilOut: 4, daysUntilOutLabel: "4 Days", inCart: false, autoReorder: false, urgency: "low", quantity: 4, unit: "ct", preferredBrand: "Fage", avgConsumptionDays: 7, lastPurchased: "2026-07-04" },
  { id: "d3", name: "Cheddar Cheese", category: "Dairy", image: "🧀", dishesUsedIn: 12, daysUntilOut: 7, daysUntilOutLabel: "1 Week", inCart: false, autoReorder: false, urgency: "normal", quantity: 1, unit: "block", preferredBrand: "Tillamook", avgConsumptionDays: 10, lastPurchased: "2026-07-02" },
  { id: "d4", name: "Butter", category: "Dairy", image: "🧈", dishesUsedIn: 20, daysUntilOut: 10, daysUntilOutLabel: "10 Days", inCart: false, autoReorder: false, urgency: "normal", quantity: 1, unit: "block", preferredBrand: "Kerrygold", avgConsumptionDays: 14, lastPurchased: "2026-06-28" },

  // Beverages
  { id: "bv1", name: "Orange Juice", category: "Beverages", image: "🧃", dishesUsedIn: 0, daysUntilOut: 3, daysUntilOutLabel: "3 Days", inCart: false, autoReorder: false, urgency: "critical", quantity: 1, unit: "carton", preferredBrand: "Tropicana", avgConsumptionDays: 5, lastPurchased: "2026-07-05" },
  { id: "bv2", name: "Sparkling Water", category: "Beverages", image: "💧", dishesUsedIn: 0, daysUntilOut: 5, daysUntilOutLabel: "5 Days", inCart: false, autoReorder: false, urgency: "low", quantity: 1, unit: "pack", preferredBrand: "Topo Chico", avgConsumptionDays: 7, lastPurchased: "2026-07-03" },
];

export type Category = GroceryItem["category"];

export const CATEGORIES: Category[] = [
  "Veggies",
  "Fruits",
  "Meat",
  "Staples",
  "Breads",
  "Dairy",
  "Beverages",
];
