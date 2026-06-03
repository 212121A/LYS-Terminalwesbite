import * as esbuild from "esbuild";

const entryPoints = ["src/index.ts", "src/serverless.ts"];

await esbuild.build({
  entryPoints,
  bundle: true,
  /** Vercel: vorgebündeltes ESM mit eingebetteten `node:*`-Shims → „Dynamic require of node:events“. */
  packages: "external",
  platform: "node",
  target: "node20",
  format: "esm",
  outdir: "dist",
  outExtension: { ".js": ".mjs" },
  sourcemap: true,
  logLevel: "info",
});
