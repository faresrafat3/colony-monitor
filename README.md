# Colony Monitor

Watch an AI agent prove its own behavior: a real mission runs through
[colony-kernel](https://github.com/faresrafat3/colony-kernel) in your browser —
models propose, only the kernel commits. Denials are durably recorded as
evidence, approvals are content-addressed, and a replay rebuilds byte-identical
state (same event-log hash on every run).

**Live demo:** https://faresrafat3.github.io/colony-monitor/ · **Submission kit (Nebius × NVIDIA):** `career-engine/08-NEBIUS-SUBMISSION.md` in the sibling `career-engine` repo.

## Build from a fresh clone (order matters)

The deployable site is **generated**: `public/kernel/**` and
`public/colony-driver.mjs` are untracked and produced by the build, which
vendors the kernel from a sibling clone.

```sh
# 1. clone the kernel as a SIBLING directory (../colony-kernel)
git clone https://github.com/faresrafat3/colony-kernel ../colony-kernel
# 2. build the kernel (produces dist/, which build.mjs vendors)
cd ../colony-kernel && npm install && npm run build && cd -
# 3. generate + verify this repo (fails cleanly if step 2 was skipped)
node build.mjs
# 4. publish (clean tree required; gh-pages carries the generated artifacts)
bash deploy.sh
```

`node build.mjs --check` verifies without generating: exit `0` fresh,
`1` missing/broken, `2` stale (bytes differ from a fresh regeneration).

## Layout

| Path | Tracked? | What |
|---|---|---|
| `src/colony-driver.mjs` | ✅ | drives one deterministic mission; exports `lastKernel` for inspection |
| `public/index.html`, `public/app.mjs` | ✅ | handwritten dashboard; `app.mjs` mirrors kernel state (`missionSequence`, `listRejections`) |
| `public/kernel/**`, `public/colony-driver.mjs` | ❌ generated | vendored kernel + assembled driver, rebuilt every `build.mjs`/`deploy.sh` |

Zero runtime dependencies, zero network requests after page load, deterministic
by construction (injected clock + seeded IDs) — same seed, byte-identical runs.
