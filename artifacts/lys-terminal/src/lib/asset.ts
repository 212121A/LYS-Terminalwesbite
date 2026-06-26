/** Asset-URL relativ zum Vite-`BASE_URL` auflösen (Kiosk läuft ggf. unter Subpfad). */
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function assetUrl(path?: string | null): string | null {
  if (!path) return null;
  return `${BASE}/${path.replace(/^\//, "")}`;
}
