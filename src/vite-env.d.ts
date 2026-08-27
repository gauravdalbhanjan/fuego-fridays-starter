/// <reference types="vite/client" />

/**
 * Minimal typing for Vite's import.meta.env so the build works even with a
 * restricted `types` array in tsconfig. BASE_URL reflects the configured
 * Vite `base` (e.g. "/fuego-fridays-starter/" on GitHub Pages, "/" locally).
 */
interface ImportMetaEnv {
  readonly BASE_URL: string;
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly SSR: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
