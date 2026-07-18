import * as esbuild from "esbuild";
import { cp, rm, mkdir } from "node:fs/promises";

const watch = process.argv.includes("--watch");
// Watch or --dev builds development React (warnings) with source maps.
// A plain build ships production React (stripped, CSP-safe).
const dev = watch || process.argv.includes("--dev");
const mode = dev ? "development" : "production";

const entries = [
  "src/background.ts",
  "src/offscreen.ts",
  "src/content.ts",
  "src/popup.tsx",
  "src/options.tsx"
];

const staticAssets = [
  "manifest.json",
  "offscreen.html",
  "popup.html",
  "options.html",
  "icons"
];

async function copyStatic() {
  for (const asset of staticAssets) {
    await cp(asset, `dist/${asset}`, { recursive: true }).catch(() => {});
  }
}

const options = {
  entryPoints: entries.filter((e) => existsSyncSafe(e)),
  bundle: true,
  format: "iife",
  target: "chrome110",
  outdir: "dist",
  logLevel: "info",
  jsx: "automatic",
  sourcemap: dev,
  define: { "process.env.NODE_ENV": JSON.stringify(mode) }
};

import { existsSync } from "node:fs";
function existsSyncSafe(p) {
  return existsSync(p);
}

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  await copyStatic();
  console.log(`watching (${mode})...`);
} else {
  await esbuild.build(options);
  await copyStatic();
  console.log(`build complete (${mode})`);
}
