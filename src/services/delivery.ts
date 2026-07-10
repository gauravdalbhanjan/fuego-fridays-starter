/**
 * Delivery service adapter layer — pluggable integration for grocery delivery.
 * 
 * Designed as an interface so real APIs (Instacart, Amazon Fresh, etc.)
 * can be swapped in without rearchitecting.
 */

import type { DeliveryService, ReorderItem } from "@/types";

/**
 * Generic URL-based delivery adapter.
 * Builds a search URL with items as query params.
 */
const genericAdapter: DeliveryService = {
  name: "Generic Search",
  id: "generic",
  buildCartUrl: (items: ReorderItem[]) => {
    const query = items
      .filter((i) => i.included)
      .map((i) => `${i.brand ? i.brand + " " : ""}${i.name}`)
      .join(", ");
    return `https://www.google.com/search?q=buy+groceries+${encodeURIComponent(query)}`;
  },
};

/**
 * Instacart deep-link adapter (best-effort URL approach).
 * Instacart doesn't have a public consumer cart API, so this uses their
 * search URL pattern.
 */
const instacartAdapter: DeliveryService = {
  name: "Instacart",
  id: "instacart",
  buildCartUrl: (items: ReorderItem[]) => {
    const query = items
      .filter((i) => i.included)
      .map((i) => `${i.brand ? i.brand + " " : ""}${i.name}`)
      .join(" ");
    return `https://www.instacart.com/store/search/${encodeURIComponent(query)}`;
  },
};

/**
 * Amazon Fresh adapter (search URL approach).
 */
const amazonFreshAdapter: DeliveryService = {
  name: "Amazon Fresh",
  id: "amazon-fresh",
  buildCartUrl: (items: ReorderItem[]) => {
    const query = items
      .filter((i) => i.included)
      .map((i) => i.name)
      .join(" ");
    return `https://www.amazon.com/s?k=${encodeURIComponent(query)}&i=amazonfresh`;
  },
};

/**
 * Walmart Grocery adapter.
 */
const walmartAdapter: DeliveryService = {
  name: "Walmart Grocery",
  id: "walmart",
  buildCartUrl: (items: ReorderItem[]) => {
    const query = items
      .filter((i) => i.included)
      .map((i) => i.name)
      .join(" ");
    return `https://www.walmart.com/search?q=${encodeURIComponent(query)}`;
  },
};

/** All available delivery services */
export const DELIVERY_SERVICES: DeliveryService[] = [
  instacartAdapter,
  amazonFreshAdapter,
  walmartAdapter,
  genericAdapter,
];

/** Get a delivery service by ID */
export function getDeliveryService(id: string): DeliveryService | undefined {
  return DELIVERY_SERVICES.find((s) => s.id === id);
}

/** Get default delivery service */
export function getDefaultService(): DeliveryService {
  return instacartAdapter;
}
