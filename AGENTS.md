# colony-monitor — watch an agent prove its own behavior

A real mission runs through an AI agent and the monitor turns what happened
into something you can watch: build → verify → serve.

## Contract

Global harness contract: `~/AGENTS.md` (permissions, single-source configs,
tools index). This file adds repo identity only — never contradicts it.

## Commands

```
npm run build:vendor   # vendor assets first (fresh checkout)
npm run build
npm run verify         # gate — must be green
npm run serve          # local preview
```

## Map

- `build.mjs` · `src/` · `public/` · `deploy.sh`

## Rules

- `npm run verify` green + clean tree before claiming done
- artifacts English; push everything (origin: faresrafat3/colony-monitor)
