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
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
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

// Whole directories, copied as they are. domain/ must stay pure, so anything
// browser-hostile appearing in one of these fails the scan below.
const VENDORED_DIRS = ["application", "domain", "ports", "testing"];

// adapters/ is the kernel's host-binding seam: a Node-only adapter (Hermes,
// which spawns processes) sits beside the browser-safe ones. The demo needs a
// declared subset, not the whole directory, so the seam can stay open upstream
// without breaking this build. Adding an adapter here is a decision, not an
// accident — and the index below re-exports exactly these three.
const BROWSER_SAFE_ADAPTERS = ["fake-agent-runtime", "in-memory-storage", "kernel-adapters"];

const VENDOR_INDEX = `export { ColonyKernel } from "./application/colony-kernel.js";
export { InMemoryColonyStorage } from "./adapters/in-memory-storage.js";
export { DeterministicClock, DeterministicIdGenerator, InMemoryTelemetry } from "./adapters/kernel-adapters.js";
export { FakeAgentRuntime } from "./adapters/fake-agent-runtime.js";
`;

function listFiles(dir, prefix = "") {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...listFiles(p, `${prefix}${name}/`));
    else out.push(prefix + name);
  }
  return out;
}

/**
 * What a fresh vendor run would produce, as relPath -> exact bytes. Computed
 * without writing anything, so --check can compare the whole tree instead of
 * spot-checking two files.
 */
function expectedVendored() {
  const files = new Map();
  for (const entry of VENDORED_DIRS) {
    const from = join(dist, entry);
    if (!existsSync(from)) continue;
    for (const rel of listFiles(from, `${entry}/`)) files.set(rel, readFileSync(join(dist, rel)));
  }
  const adapters = join(dist, "adapters");
  if (existsSync(adapters)) {
    for (const name of BROWSER_SAFE_ADAPTERS) {
      for (const ext of [".js", ".d.ts", ".js.map"]) {
        const p = join(adapters, name + ext);
        if (existsSync(p)) files.set(`adapters/${name}${ext}`, readFileSync(p));
      }
    }
  }
  files.set("index.js", Buffer.from(VENDOR_INDEX));
  return files;
}

const HOSTILE = (text) =>
  /from\s+["']node:/m.test(text) || /\bprocess\.\w/.test(text) || /\bBuffer\b/.test(text) || /\brequire\(/.test(text);

if (!checkOnly) {
  const files = expectedVendored();
  rmSync(vendorOut, { recursive: true, force: true });
  mkdirSync(vendorOut, { recursive: true });
  for (const [rel, bytes] of files) {
    const to = join(vendorOut, rel);
    mkdirSync(dirname(to), { recursive: true });
    writeFileSync(to, bytes);
  }

  // Gate: every vendored .js must run in a browser.
  const bad = [...files]
    .filter(([rel]) => rel.endsWith(".js"))
    .filter(([, bytes]) => HOSTILE(bytes.toString("utf8")))
    .map(([rel]) => rel);
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

// The vendored kernel is byte-identical iff a dry re-vendor matches on disk.
// Compared file by file against the whole expected set: a spot-check of two
// files let a stale tree pass whenever the sibling kernel added a module, which
// is how a Node-only adapter sat in public/kernel for a deploy cycle.
const expectedFiles = expectedVendored();
const onDisk = new Set();
const walkDisk = (dir, prefix = "") => {
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkDisk(p, `${prefix}${name}/`);
    else onDisk.add(prefix + name);
  }
};
walkDisk(vendorOut);

const staleFiles = [];
for (const [rel, bytes] of expectedFiles) {
  const p = join(vendorOut, rel);
  if (!existsSync(p)) {
    staleFiles.push(`${rel}: missing`);
  } else if (!readFileSync(p).equals(bytes)) {
    staleFiles.push(`${rel}: bytes differ from ../colony-kernel/dist`);
  }
}
const extraFiles = [...onDisk].filter((rel) => !expectedFiles.has(rel));
if (extraFiles.length) {
  staleFiles.push(`${extraFiles.length} file(s) vendored but no longer expected: ${extraFiles.join(", ")}`);
}
if (staleFiles.length) {
  fail(2,
    `STALE: public/kernel differs from a fresh vendor run (${staleFiles.length}):`,
    ...staleFiles.slice(0, 12).map((l) => `  ${l}`),
    "Run `node build.mjs`.");
}

// A vendored file that cannot run in a browser must not ship, checked or not.
const unsafe = [...expectedFiles]
  .filter(([rel]) => rel.endsWith(".js"))
  .filter(([, bytes]) => HOSTILE(bytes.toString("utf8")))
  .map(([rel]) => rel);
if (unsafe.length) {
  fail(1, "BROWSER-UNSAFE files in vendored kernel:\n" + unsafe.join("\n"));
}

console.log(
  `build check: ${expectedFiles.size} vendored files byte-identical to a fresh regeneration, browser-safe, driver current`
);
