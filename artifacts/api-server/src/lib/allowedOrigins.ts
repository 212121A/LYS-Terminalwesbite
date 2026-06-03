/**
 * Erlaubte Browser-Origins: statische Liste + Vercel-Deployments für dieses Projekt + PUBLIC_WEB_ORIGIN.
 * (LYS Restaurant nutzt nur feste Origins; Terminal braucht zusätzlich *.vercel.app-Preview-URLs.)
 */
const STATIC_ORIGINS = new Set([
  "https://lysnoodleandrice.com",
  "https://lys-terminal-bestellseite.vercel.app",
  "http://localhost:5173",
]);

function normalizeOrigin(o: string): string {
  return o.replace(/\/$/, "");
}

/** CORS + Stripe success_url: gleiche Logik wie erlaubte `origin` aus dem Checkout-Body. */
export function isAllowedBrowserOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  const o = normalizeOrigin(origin);
  if (STATIC_ORIGINS.has(o)) return true;
  const pub = process.env.PUBLIC_WEB_ORIGIN?.trim();
  if (pub && o === normalizeOrigin(pub)) return true;
  if (o.includes("lys-terminal-bestellseite") && /\.vercel\.app$/i.test(o)) return true;
  return false;
}

export function checkoutRedirectOrigin(originFromBody: unknown): string {
  if (typeof originFromBody === "string" && isAllowedBrowserOrigin(originFromBody)) {
    return normalizeOrigin(originFromBody);
  }
  const fallback =
    process.env.PUBLIC_WEB_ORIGIN?.trim() || "https://lys-terminal-bestellseite.vercel.app";
  return normalizeOrigin(fallback);
}

/** Stripe `success_url` / `cancel_url`: nur gleiche Origins wie CORS erlaubt. */
export function isAllowedCheckoutReturnUrl(url: unknown): boolean {
  if (typeof url !== "string" || !url.trim()) return false;
  try {
    const u = new URL(url);
    return isAllowedBrowserOrigin(u.origin);
  } catch {
    return false;
  }
}
