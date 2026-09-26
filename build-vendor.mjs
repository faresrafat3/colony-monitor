/**
 * build-vendor.mjs — vendor colony-kernel's browser-safe dist/ into public/kernel.
 *
 * The kernel core is pure (only dist/demo/ touches node globals), and its files
 * import each other with relative "./x.js" specifiers that browsers resolve
 * natively — so vendoring = copy dist (minus demo/) + emit an index re-export.
 * Then a hard gate: fail the build if any vendored file references node:*
 * modules, `process.`, `Buffer`, or `require(` — the demo must never break
 * silently in a browser.
 */
import { cpSync, mkdirSync, existsSync, rmSync, readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, "..", "colony-kernel", "dist");
const out = join(root, "public", "kernel");

if (!existsSync(src)) {
  console.error("colony-kernel dist not found — run `npm run build` in ../colony-kernel first");
  process.exit(1);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const entry of ["adapters", "application", "domain", "ports", "testing"]) {
  if (existsSync(join(src, entry))) cpSync(join(src, entry), join(out, entry), { recursive: true });
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
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
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
console.log(`vendored kernel -> public/kernel (${out}) — browser-safe gate passed`);
