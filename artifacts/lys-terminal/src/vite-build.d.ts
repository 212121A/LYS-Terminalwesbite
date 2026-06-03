/** Ersetzt durch Vite `define` (Vercel: Git-SHA, sonst Zeitstempel) */
declare const __APP_BUILD_ID__: string;

/** Optional: wie LYS Website — Checkout-POST gegen absoluten API-Host */
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}
