/**
 * Vercel Node-Function — Express-Handler fuer alle `/api/*`-Pfade.
 *
 * Hintergrund: Der `vercel.json`-Rewrite `/api/(.*) → /api/index?__path=$1` leitet
 * jeden `/api/...`-Aufruf hierher und packt den Original-Pfad in den `__path`-Query.
 * Wir stellen vor der Express-App den Original-Pfad in `req.url` wieder her, sonst
 * sieht Express nur `/api/index` und liefert 404 (das fruehere Symptom: 65s-Timeout
 * im Frontend, weil die Funktion zwar antwortet, aber der Client lange wartet).
 */
import app from "./serverless.mjs";

function rebuildUrl(req) {
  const raw = typeof req.url === "string" ? req.url : "/";
  const qIdx = raw.indexOf("?");
  const search = qIdx >= 0 ? raw.slice(qIdx + 1) : "";
  if (!search) return null;
  const params = new URLSearchParams(search);
  const path = params.get("__path");
  if (path === null) return null;
  params.delete("__path");
  const cleaned = `/api/${path.replace(/^\/+/, "")}`;
  const remaining = params.toString();
  return remaining ? `${cleaned}?${remaining}` : cleaned;
}

export default function handler(req, res) {
  const restored = rebuildUrl(req);
  if (restored) {
    req.url = restored;
  } else if (!req.url || req.url === "/" || req.url === "/api/index" || req.url.startsWith("/api/index?")) {
    req.url = "/api/health";
  }
  return app(req, res);
}
