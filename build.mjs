import * as esbuild from "esbuild";
import { cp, rm, mkdir } from "node:fs/promises";

// Load .env (gitignored) so SUPABASE_* can be injected at build time. In CI these come from real env vars.
try { process.loadEnvFile(".env"); } catch {}

const watch = process.argv.includes("--watch");
// Watch or --dev builds development React (warnings) with source maps.
// A plain build ships production React (stripped, CSP-safe).
const dev = watch || process.argv.includes("--dev");
const mode = dev ? "development" : "production";

// A production build with no Supabase creds would silently drop all intent/feedback. Warn loudly.
if (mode === "production" && (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY)) {
  console.warn("[build] WARNING: SUPABASE_URL / SUPABASE_ANON_KEY are not set. This production build will NOT record intent or feedback. Set them in .env (see .env.example).");
}

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
  define: {
    "process.env.NODE_ENV": JSON.stringify(mode),
    "process.env.SUPABASE_URL": JSON.stringify(process.env.SUPABASE_URL || ""),
    "process.env.SUPABASE_ANON_KEY": JSON.stringify(process.env.SUPABASE_ANON_KEY || "")
  }
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
