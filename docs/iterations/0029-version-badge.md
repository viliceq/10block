# Iteration 29 — On-screen version badge

**Date:** 2026-05-17.
**Status:** Complete.

## Goal

Make the running build identifiable at a glance on device (the user couldn't tell which deploy they were testing).

## Decision — versioning scheme

`APP_VERSION` (`src/version.ts`) = `v<iteration>`, the integer tracking the latest `docs/iterations/NNNN-*`. A fix shipped **without** its own iteration doc bumps a patch suffix (`v28.1`, `v28.2`), which resets when the next iteration lands. A test pins the integer to the max iteration number so it cannot silently drift. This iteration is itself 0029, so the badge now reads `v29` — self-demonstrating.

(The placeholder `VERSION = '0.0.0'` from scaffolding iteration 0000, used only by `smoke.test.ts`, is repurposed into `APP_VERSION`.)

## Acceptance criteria

1. `src/version.ts` exports `APP_VERSION` (`/^v\d+(\.\d+)?$/`) and `createVersionBadge()`.
2. A test enforces `APP_VERSION`'s integer === the latest `docs/iterations` number.
3. `createVersionBadge()` returns a decorative (`aria-hidden`) `.version` element whose text is `APP_VERSION`.
4. Mounted by `main.ts`; `position: fixed`, so it is **not** a grid item and does not perturb the iteration-27 shell grid.
5. Anchored within the safe box (`bottom`/`right` fold `env(safe-area-inset-*)` per §8.9); `pointer-events: none` so it never intercepts a drag; faint (`opacity: 0.3`).
6. Full suite + typecheck green; browser-checked (WebKit) for placement, non-blocking, and undisturbed layout.

## Patches

- **v29.1** — badge reported invisible in the iOS PWA (visible on desktop). Root causes: z-index `1` placed it *below* the full-screen start gate (z 1100), and at `opacity: 0.3` / no background it was easy to miss; compounded by the iOS PWA serving a stale cached build (the very problem the badge exists to expose). Fix: new `--z-version` token (1200, above the start gate) so the build is readable even before the gate is dismissed; opacity → 0.6 with a backdrop pill and slightly larger text. The user must force-quit & reopen the PWA once for the new service-worker bundle to take effect.

## Files

- `src/version.ts`, `src/styles/version.css` (new), `src/main.ts`
- `tests/version.test.ts` (new), `tests/page-mount.test.ts`, `tests/smoke.test.ts`
- `CLAUDE.md` — record the version-bump step in the iteration loop.
