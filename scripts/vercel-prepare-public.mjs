/**
 * Kopiert Vite-Build artifacts/lys-terminal/dist → ./public
 * Fallback: minimales index.html, falls dist fehlt.
 */
import { cpSync, mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pub = join(root, "public");
const dist = join(root, "artifacts/lys-terminal/dist");

if (existsSync(dist)) {
  if (existsSync(pub)) rmSync(pub, { recursive: true, force: true });
  mkdirSync(join(root), { recursive: true });
  cpSync(dist, pub, { recursive: true });
} else {
  mkdirSync(pub, { recursive: true });
  const index = join(pub, "index.html");
  writeFileSync(
    index,
    `<!doctype html><html lang="de"><head><meta charset="utf-8"/><title>LYS Terminal</title></head><body><p>Frontend-Build fehlt (artifacts/lys-terminal/dist). Prüfe <code>npm run build</code> im Ordner lys-terminal.</p></body></html>\n`,
  );
}
