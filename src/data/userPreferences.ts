/**
 * User preferences and automation settings for PantryPilot.
 */

export interface UserPreferences {
  /** Items with autoReorder enabled will be added to cart automatically */
  autoReorderEnabled: boolean;
  /** Days threshold — items within this many days of running out get flagged */
  urgencyThresholdDays: number;
  /** Auto-add critical items to cart without user confirmation */
  autoAddCritical: boolean;
  /** Preferred delivery service id */
  preferredServiceId: string;
  /** Weekly shopping day (0=Sun, 1=Mon, ..., 6=Sat) */
  shoppingDay: number;
  /** Budget limit per auto-order */
  budgetLimit: number;
  /** Notification preferences */
  notifications: {
    lowStock: boolean;
    autoOrderConfirmation: boolean;
    weeklyDigest: boolean;
  };
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  autoReorderEnabled: true,
  urgencyThresholdDays: 3,
  autoAddCritical: false,
  preferredServiceId: "instacart",
  shoppingDay: 6, // Saturday
  budgetLimit: 150,
  notifications: {
    lowStock: true,
    autoOrderConfirmation: true,
    weeklyDigest: true,
  },
};

const STORAGE_KEY = "pantrypilot_preferences";

export function loadPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) } : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(prefs: UserPreferences): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}
