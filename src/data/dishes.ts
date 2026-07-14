/**
 * Dish/recipe data with ingredients mapped to pantry items.
 * pantryMatch is calculated dynamically based on what's in stock.
 */

export interface Dish {
  id: string;
  name: string;
  image: string; // path to image in /meals/ or emoji fallback
  cookTime: number; // minutes
  calories: number;
  ingredients: string[]; // maps to grocery item names
  category: "breakfast" | "lunch" | "dinner" | "snack" | "dessert";
  difficulty: "easy" | "medium" | "hard";
}

export const DISHES: Dish[] = [
  {
    id: "d1",
    name: "Caesar Salad",
    image: "/meals/caesar-salad.png",
    cookTime: 10,
    calories: 350,
    ingredients: ["Spinach", "Chicken Breast", "Cheddar Cheese", "Sourdough", "Olive Oil"],
    category: "lunch",
    difficulty: "easy",
  },
  {
    id: "d2",
    name: "Bundt Cake",
    image: "/meals/bundt-cake.png",
    cookTime: 60,
    calories: 350,
    ingredients: ["Eggs", "Butter", "Whole Milk"],
    category: "dessert",
    difficulty: "medium",
  },
  {
    id: "d3",
    name: "Chicken Strips",
    image: "/meals/chicken-nuggets.png",
    cookTime: 15,
    calories: 500,
    ingredients: ["Chicken Breast", "Eggs", "Sourdough"],
    category: "dinner",
    difficulty: "easy",
  },
  {
    id: "d4",
    name: "Agliolio Spaghetti",
    image: "/meals/spaghetti.png",
    cookTime: 12,
    calories: 550,
    ingredients: ["Pasta", "Olive Oil", "Onion", "Bell Peppers"],
    category: "dinner",
    difficulty: "easy",
  },
  {
    id: "d5",
    name: "Caesar Wrap",
    image: "/meals/caesar-salad.png",
    cookTime: 8,
    calories: 420,
    ingredients: ["Tortillas", "Chicken Breast", "Spinach", "Cheddar Cheese"],
    category: "lunch",
    difficulty: "easy",
  },
  {
    id: "d6",
    name: "Bacon Ham Sandwich",
    image: "/meals/sandwich.png",
    cookTime: 10,
    calories: 480,
    ingredients: ["Sourdough", "Tomatoes", "Spinach"],
    category: "lunch",
    difficulty: "easy",
  },
  {
    id: "d7",
    name: "Guacamole",
    image: "/meals/guacamole.png",
    cookTime: 10,
    calories: 250,
    ingredients: ["Onion", "Tomatoes", "Bell Peppers"],
    category: "snack",
    difficulty: "easy",
  },
  {
    id: "d8",
    name: "Chicken Stir Fry",
    image: "/meals/turkey-dinner.png",
    cookTime: 20,
    calories: 450,
    ingredients: ["Chicken Breast", "Broccoli", "Carrots", "Bell Peppers", "Rice", "Olive Oil"],
    category: "dinner",
    difficulty: "medium",
  },
  {
    id: "d9",
    name: "Poha Bowl",
    image: "/meals/poha.png",
    cookTime: 5,
    calories: 180,
    ingredients: ["Apple", "Banana", "Berries", "Greek Yogurt"],
    category: "breakfast",
    difficulty: "easy",
  },
  {
    id: "d10",
    name: "Veggie Omelette",
    image: "/meals/turkey-dinner.png",
    cookTime: 12,
    calories: 320,
    ingredients: ["Eggs", "Spinach", "Tomatoes", "Cheddar Cheese", "Bell Peppers", "Onion"],
    category: "breakfast",
    difficulty: "easy",
  },
  {
    id: "d11",
    name: "Grilled Salmon",
    image: "/meals/turkey-dinner.png",
    cookTime: 18,
    calories: 380,
    ingredients: ["Salmon", "Zucchini", "Olive Oil", "Spinach"],
    category: "dinner",
    difficulty: "medium",
  },
  {
    id: "d12",
    name: "Banana Smoothie",
    image: "/meals/poha.png",
    cookTime: 5,
    calories: 220,
    ingredients: ["Banana", "Whole Milk", "Greek Yogurt", "Berries"],
    category: "breakfast",
    difficulty: "easy",
  },
  {
    id: "d13",
    name: "Pasta Bolognese",
    image: "/meals/spaghetti.png",
    cookTime: 35,
    calories: 620,
    ingredients: ["Pasta", "Ground Beef", "Tomatoes", "Onion", "Carrots", "Olive Oil"],
    category: "dinner",
    difficulty: "medium",
  },
  {
    id: "d14",
    name: "Avocado Toast",
    image: "/meals/sandwich.png",
    cookTime: 5,
    calories: 280,
    ingredients: ["Sourdough", "Eggs", "Tomatoes", "Spinach"],
    category: "breakfast",
    difficulty: "easy",
  },
  {
    id: "d15",
    name: "Chicken Burger",
    image: "/meals/burger.png",
    cookTime: 20,
    calories: 580,
    ingredients: ["Tortillas", "Chicken Breast", "Onion", "Tomatoes", "Cheddar Cheese"],
    category: "dinner",
    difficulty: "easy",
  },
  {
    id: "d16",
    name: "French Fries",
    image: "/meals/fries.png",
    cookTime: 15,
    calories: 365,
    ingredients: ["Carrots", "Olive Oil"],
    category: "snack",
    difficulty: "easy",
  },
];

/**
 * Calculate pantry match percentage for a dish.
 * Returns how many of the ingredients are currently available.
 */
export function calculatePantryMatch(
  dish: Dish,
  availableItems: string[],
): number {
  if (dish.ingredients.length === 0) return 100;
  const normalizedAvailable = availableItems.map((i) => i.toLowerCase());
  const matched = dish.ingredients.filter((ing) =>
    normalizedAvailable.includes(ing.toLowerCase()),
  );
  return Math.round((matched.length / dish.ingredients.length) * 100);
}

/**
 * Get missing ingredients for a dish.
 */
export function getMissingIngredients(
  dish: Dish,
  availableItems: string[],
): string[] {
  const normalizedAvailable = availableItems.map((i) => i.toLowerCase());
  return dish.ingredients.filter(
    (ing) => !normalizedAvailable.includes(ing.toLowerCase()),
  );
}
