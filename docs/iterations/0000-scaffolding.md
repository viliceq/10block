# Iteration 0 — Scaffolding

**Date:** 2026-05-13.
**Status:** Complete.

## Goal

Stand up project infrastructure so iteration 1 can begin in TDD mode.

## What landed

- `package.json` with Vite, Vitest, Playwright, TypeScript.
- `tsconfig.json` — strict mode + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`.
- `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts` (iPad Safari emulation).
- `index.html` with PWA meta tags and theme-color matching the Modern Dark palette.
- `src/main.ts` — placeholder boot.
- `src/version.ts` — exports a `VERSION` constant; lets the smoke test prove src imports work.
- `tests/smoke.test.ts` — three tests verifying Vitest runs, src imports resolve, and jsdom is wired up.
- `CLAUDE.md` — repo memory bank.
- `CONTEXT.md` — domain glossary.
- `docs/adr/0001-tech-stack.md` — locks in vanilla TS + Vite + Vitest + Playwright.
- `.claude/agents/{test-author,implementer,verifier}.md` — three subagents.
- `.claude/hooks/run-tests-if-src.sh` — hook script that runs Vitest after edits in `src/` or `tests/`.
- `.claude/settings.json` — `PostToolUse` hook wired to the script.
- `.gitignore` — node_modules, build outputs, per-machine Claude state.

## Verification

- `npm install` succeeded.
- `npm run test:run` is green (3/3 smoke tests pass).

## What this iteration did NOT do

- No game logic.
- No board rendering.
- No piece definitions or piece catalogue.
- No `tokens.css` (deferred to iteration 1 where the first CSS rules will consume tokens).
- No Playwright e2e tests yet (added in iteration 1 once there is something to point at).

## Next — iteration 1

Render an empty 10 × 10 board. TDD: tests assert 100 `[data-state="empty"]` cells exist inside `.board`, and the board container is present in the DOM.
