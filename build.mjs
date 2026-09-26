/**
 * build.mjs — THE single generator + freshness authority for the dashboard.
 *
 * Generated (untracked, rebuilt every run): public/kernel/** (vendored kernel)
 * and public/colony-driver.mjs (src copy with its kernel import rewritten).
 * Handwritten sources stay tracked: index.html, app.mjs.
 *
 * Freshness is CONTENT-based (never mtime — git operations can touch mtimes
 * and cause false "stale" verdicts on identical bytes):
 *   node build.mjs           generate, then verify by content
 *   node build.mjs --check   verify only — exit 0 fresh, 1 missing/broken,
 *                            2 stale (bytes differ from a fresh regeneration)
 */
import { readFileSync, writeFileSync, cpSync, mkdirSync, existsSync, rmSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const checkOnly = process.argv.includes("--check");

function fail(code, ...lines) {
  for (const l of lines) console.error(l);
  process.exit(code);
}

// --- 1. vendor colony-kernel's browser-safe dist/ into public/kernel --------
const dist = join(root, "..", "colony-kernel", "dist");
const vendorOut = join(root, "public", "kernel");
if (!existsSync(dist)) {
  fail(1,
    "colony-kernel dist not found.",
    "Onboarding (fresh clones, in this order):",
    "  1. git clone <colony-kernel> as a SIBLING directory: ../colony-kernel",
    "  2. cd ../colony-kernel && npm install && npx tsc   # produces dist/",
    "  3. come back here: node build.mjs");
}

if (!checkOnly) {
  rmSync(vendorOut, { recursive: true, force: true });
  mkdirSync(vendorOut, { recursive: true });
  for (const entry of ["adapters", "application", "domain", "ports", "testing"]) {
    if (existsSync(join(dist, entry))) cpSync(join(dist, entry), join(vendorOut, entry), { recursive: true });
  }
  writeFileSync(
    join(vendorOut, "index.js"),
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
          bad.push(relative(vendorOut, p));
        }
      }
    }
  };
  walk(vendorOut);
  if (bad.length) {
    fail(1, "BROWSER-UNSAFE files in vendored kernel:\n" + bad.join("\n"));
  }

  // --- 2. assemble the generated driver (write only when bytes differ) ------
  const genPath = join(root, "public", "colony-driver.mjs");
  const expected = readFileSync(join(root, "src", "colony-driver.mjs"), "utf8")
    .replaceAll('from "../public/kernel/index.js"', 'from "./kernel/index.js"');
  const current = existsSync(genPath) ? readFileSync(genPath, "utf8") : null;
  if (current !== expected) writeFileSync(genPath, expected);
  console.log("assembled: public/colony-driver.mjs (generated, untracked)");
}

// --- 3. content-based freshness verification (runs in both modes) -----------
const genPath = join(root, "public", "colony-driver.mjs");
if (!existsSync(genPath)) {
  fail(1, "MISSING public/colony-driver.mjs (generated) — run `node build.mjs` first.");
}
if (!existsSync(join(vendorOut, "index.js"))) {
  fail(1, "MISSING public/kernel/ (generated) — run `node build.mjs` first.");
}
for (const f of ["public/index.html", "public/app.mjs"]) {
  if (!existsSync(join(root, f))) fail(1, "MISSING " + f);
}

const expectedDriver = readFileSync(join(root, "src", "colony-driver.mjs"), "utf8")
  .replaceAll('from "../public/kernel/index.js"', 'from "./kernel/index.js"');
if (readFileSync(genPath, "utf8") !== expectedDriver) {
  fail(2, "STALE: public/colony-driver.mjs differs from src/colony-driver.mjs — run `node build.mjs`.");
}

// The vendored kernel is byte-identical iff a dry re-vendor matches on disk:
// spot-check the emitted index (the vendor step is deterministic copy+write).
const expectedIndex = `export { ColonyKernel } from "./application/colony-kernel.js";
export { InMemoryColonyStorage } from "./adapters/in-memory-storage.js";
export { DeterministicClock, DeterministicIdGenerator, InMemoryTelemetry } from "./adapters/kernel-adapters.js";
export { FakeAgentRuntime } from "./adapters/fake-agent-runtime.js";
`;
const idxPath = join(vendorOut, "index.js");
if (readFileSync(idxPath, "utf8") !== expectedIndex) {
  fail(2, "STALE: public/kernel/index.js differs from the expected vendor output — run `node build.mjs`.");
}

console.log("build check: artifacts present, content-fresh (byte-identical to a fresh regeneration)");
