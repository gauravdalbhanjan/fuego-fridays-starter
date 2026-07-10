/**
 * Meal routine data — user's daily meal schedule with preferences and habits.
 */

export interface MealRoutine {
  id: string;
  mealType: "Breakfast" | "Lunch" | "Dinner" | "Snack";
  startTime: string; // "7:00 AM"
  endTime: string; // "8:00 AM"
  activeDays: boolean[]; // [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
  gradient: string; // CSS gradient for the card background
  emoji: string;
  preferredDishes: string[]; // dish IDs
  calorieTarget?: number;
  notes?: string;
}

export const DEFAULT_ROUTINES: MealRoutine[] = [
  {
    id: "r1",
    mealType: "Breakfast",
    startTime: "7:00 AM",
    endTime: "8:00 AM",
    activeDays: [true, true, true, true, true, true, true],
    gradient: "linear-gradient(135deg, #f97316 0%, #eab308 50%, #fbbf24 100%)",
    emoji: "☕",
    preferredDishes: ["d9", "d10", "d12", "d14"],
    calorieTarget: 400,
    notes: "Light & quick on weekdays, bigger on weekends",
  },
  {
    id: "r2",
    mealType: "Lunch",
    startTime: "12:00 PM",
    endTime: "1:00 PM",
    activeDays: [false, true, true, true, true, true, false],
    gradient: "linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)",
    emoji: "🥗",
    preferredDishes: ["d1", "d5", "d6"],
    calorieTarget: 550,
    notes: "Usually meal prep or leftovers",
  },
  {
    id: "r3",
    mealType: "Dinner",
    startTime: "5:30 PM",
    endTime: "6:30 PM",
    activeDays: [true, true, true, true, true, true, true],
    gradient: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #4c1d95 100%)",
    emoji: "🍽",
    preferredDishes: ["d4", "d8", "d11", "d13", "d15"],
    calorieTarget: 700,
    notes: "Family dinner, cook fresh",
  },
  {
    id: "r4",
    mealType: "Snack",
    startTime: "3:00 PM",
    endTime: "3:30 PM",
    activeDays: [false, true, true, true, true, true, false],
    gradient: "linear-gradient(135deg, #ec4899 0%, #f43f5e 50%, #e11d48 100%)",
    emoji: "🍎",
    preferredDishes: ["d7", "d9"],
    calorieTarget: 200,
    notes: "Quick energy boost",
  },
];

const STORAGE_KEY = "pantrypilot_routines";

export function loadRoutines(): MealRoutine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_ROUTINES;
  } catch {
    return DEFAULT_ROUTINES;
  }
}

export function saveRoutines(routines: MealRoutine[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(routines));
}

export const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
