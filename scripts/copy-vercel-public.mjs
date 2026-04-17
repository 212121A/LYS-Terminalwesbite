/**
 * Kopiert den Vite-Build nach ./public (Repo-Root), damit Vercel outputDirectory
 * auf ein flaches Verzeichnis zeigen kann — /api bleibt daneben unter ./api.
 */
import { cpSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "artifacts/lys-terminal/dist/public");
const dest = path.join(root, "public");

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log("copy-vercel-public:", src, "→", dest);
