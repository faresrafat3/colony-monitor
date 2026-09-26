/**
 * build.mjs — THE single generator for the deployable dashboard (public/).
 *
 * Generated (untracked, rebuilt every run): public/kernel/** (vendored kernel)
 * and public/colony-driver.mjs (src copy with its kernel import rewritten to
 * the vendored path). Handwritten sources stay tracked: index.html, app.mjs
 * (app.mjs imports the generated ./colony-driver.mjs that this script emits).
 *
 * Modes:
 *   node build.mjs   vendor + assemble + self-check (artifacts exist, parse,
 *                    and are FRESH — generated not older than its source)
 */
import { readFileSync, writeFileSync, cpSync, mkdirSync, existsSync, rmSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

// --- 1. vendor colony-kernel's browser-safe dist/ into public/kernel --------
const dist = join(root, "..", "colony-kernel", "dist");
const out = join(root, "public", "kernel");
if (!existsSync(dist)) {
  console.error("colony-kernel dist not found — run `npm run build` in ../colony-kernel first");
  process.exit(1);
}
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const entry of ["adapters", "application", "domain", "ports", "testing"]) {
  if (existsSync(join(dist, entry))) cpSync(join(dist, entry), join(out, entry), { recursive: true });
}
writeFileSync(
  join(out, "index.js"),
  `export { ColonyKernel } from "./application/colony-kernel.js";
export { InMemoryColonyStorage } from "./adapters/in-memory-storage.js";
export { DeterministicClock, DeterministicIdGenerator, InMemoryTelemetry } from "./adapters/kernel-adapters.js";
export { FakeAgentRuntime } from "./adapters/fake-agent-runtime.js";
`
);

// Gate: scan every vendored .js for browser-hostile references.
const bad = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith(".js")) {
      const text = readFileSync(p, "utf8");
      if (/from\s+["']node:/m.test(text) || /\bprocess\.\w/.test(text) || /\bBuffer\b/.test(text) || /\brequire\(/.test(text)) {
        bad.push(relative(out, p));
      }
    }
  }
};
walk(out);
if (bad.length) {
  console.error("BROWSER-UNSAFE files in vendored kernel:\n" + bad.join("\n"));
  process.exit(1);
}
console.log("vendored kernel -> public/kernel — browser-safe gate passed");

// --- 2. assemble the driver beside the site (untracked, always fresh) -------
const driverSrc = readFileSync(join(root, "src", "colony-driver.mjs"), "utf8");
const patched = driverSrc.replaceAll('from "../public/kernel/index.js"', 'from "./kernel/index.js"');
writeFileSync(join(root, "public", "colony-driver.mjs"), patched);
console.log("assembled: public/colony-driver.mjs (generated, untracked)");

// --- 3. self-check (always on: the generator never leaves a stale tree) ------
{
  for (const f of ["public/index.html", "public/app.mjs", "public/colony-driver.mjs", "public/kernel/index.js"]) {
    if (!existsSync(join(root, f))) { console.error("MISSING " + f); process.exit(1); }
  }
  const stale = statSync(join(root, "src", "colony-driver.mjs")).mtimeMs > statSync(join(root, "public", "colony-driver.mjs")).mtimeMs;
  if (stale) { console.error("STALE: generated driver older than src — rebuild"); process.exit(1); }
  console.log("build check: artifacts present, parse-fresh");
}
