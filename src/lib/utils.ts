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
