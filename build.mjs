import * as esbuild from "esbuild";
import { cp, rm, mkdir } from "node:fs/promises";

const watch = process.argv.includes("--watch");

const entries = [
  "src/background.ts",
  "src/offscreen.ts",
  "src/content.ts",
  "src/popup.ts",
  "src/options.ts"
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
  logLevel: "info"
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
  console.log("watching...");
} else {
  await esbuild.build(options);
  await copyStatic();
  console.log("build complete");
}
