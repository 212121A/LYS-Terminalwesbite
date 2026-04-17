/**
 * Vercel: eine Serverless-Funktion für alle /api/*-Routen (Express via serverless-http).
 * Rewrite /api/(.*) → /api in vercel.json, damit dieser Handler alle Unterpfade bedient.
 */
import handler from "../artifacts/api-server/dist/serverless.mjs";

export default handler;
