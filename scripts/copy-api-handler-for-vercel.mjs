/**
 * Vercel: `api/serverless.mjs` (esbuild, packages: "external").
 * Runtime-Module installiert Vercel danach per `npm install` in `api/` aus `api/package.json`
 * (vorher: leere dependencies → npm entfernte die manuell kopierte `node_modules` → FUNCTION_INVOCATION_FAILED).
 */
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "artifacts/api-server/dist/serverless.mjs");
const apiDir = join(root, "api");
const dst = join(apiDir, "serverless.mjs");

if (!existsSync(src)) {
  console.error(`copy-api-handler-for-vercel: fehlt ${src} — zuerst api-server bauen.`);
  process.exit(1);
}

mkdirSync(apiDir, { recursive: true });
cpSync(src, dst);
console.log("copy-api-handler-for-vercel:", dst);
