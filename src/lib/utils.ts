import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names, resolving conflicts (shadcn/ui convention). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Resolve a public asset path against Vite's configured base URL so it works
 * both in local dev and when hosted under a sub-path (e.g. GitHub Pages at
 * /fuego-fridays-starter/). Pass a root-absolute path like "/meals/x.png".
 * Non-path values (emoji, etc.) are returned unchanged.
 */
export function asset(path: string): string {
  if (!path || !path.startsWith("/")) return path;
  const base = import.meta.env.BASE_URL || "/"; // e.g. "/fuego-fridays-starter/"
  return base.replace(/\/$/, "") + path;
}

/** Semantic color tiers used by the dish chips. */
export type ChipTier = "green" | "amber" | "red";

const CHIP_TIER_CLASSES: Record<ChipTier, string> = {
  green: "bg-[#2e7d32] text-white",
  amber: "bg-[#c77800] text-white",
  red: "bg-[#c62828] text-white",
};

/** Tailwind classes for a chip tier (solid, high-contrast pill). */
export function chipTierClass(tier: ChipTier): string {
  return CHIP_TIER_CLASSES[tier];
}

/** Higher is better: pantry match %. >=80 green, >=50 amber, else red. */
export function matchTier(match: number): ChipTier {
  if (match >= 80) return "green";
  if (match >= 50) return "amber";
  return "red";
}

/** Lower is better: cook time in minutes. <=15 green, <=30 amber, else red. */
export function timeTier(minutes: number): ChipTier {
  if (minutes <= 15) return "green";
  if (minutes <= 30) return "amber";
  return "red";
}

/** Lower is better: calories. <=350 green, <=500 amber, else red. */
export function caloriesTier(kcal: number): ChipTier {
  if (kcal <= 350) return "green";
  if (kcal <= 500) return "amber";
  return "red";
}

const TIER_POINTS: Record<ChipTier, number> = { green: 2, amber: 1, red: 0 };

/**
 * Combined "greenness" of a dish across its three chips (match, time, calories).
 * Higher = greener overall. Used to rank meal cards: greener sorts to the top,
 * redder to the bottom. Match is weighted a bit higher, then pantryMatch is used
 * as a tie-breaker so ordering is stable and intuitive.
 */
export function greenScore(match: number, minutes: number, kcal: number): number {
  const score =
    TIER_POINTS[matchTier(match)] * 1.2 +
    TIER_POINTS[timeTier(minutes)] +
    TIER_POINTS[caloriesTier(kcal)];
  // fractional bonus from raw match keeps sorting stable within the same tier
  return score + match / 1000;
}
