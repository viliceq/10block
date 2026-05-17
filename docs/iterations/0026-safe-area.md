# Iteration 26 — Safe-area plumbing + combo-callout reposition

**Date:** 2026-05-17.
**Status:** Complete.

## Goal

Independently fix layout **issue #1** (the combo message overlaps the camera / Dynamic Island and is unreadable), with minimal blast radius, *before* the iteration-27 structural rework. CSS-only; no JS/behaviour change.

Per SPEC §8.9: every shell edge that bounds content uses `max(<token>, env(safe-area-inset-<side>))`; no fixed/absolute element may occupy the inset zone.

## Acceptance criteria

1. `#app` padding becomes per-side `max(var(--screen-pad), env(safe-area-inset-<side>))` for all four sides (replacing the single `padding: var(--screen-pad)`), so the HUD/board/tray clear the notch, Dynamic Island, side cutouts, and home indicator in both orientations.
2. `.combo-callout` vertical anchor changes from `top: var(--screen-pad)` to `top: max(var(--screen-pad), env(safe-area-inset-top))` — it can never render under the top inset zone again.
3. `.combo-callout` is horizontally centred within the **safe** box, not the raw viewport: `left: calc(50% + (env(safe-area-inset-left) - env(safe-area-inset-right)) / 2)` — correct in landscape with a side cutout too. The existing `transform: translateX(-50%)` and `comboPulse` keyframe are unchanged.
4. `index.html` keeps `viewport-fit=cover` (prerequisite for `env()` to resolve to non-zero); locked by a test.
5. `combo.css` drops its duplicated `font-family` declaration (inherits from `body`, per the iteration-14 convention that hud/overlay already follow).
6. No JS change: `game.ts` combo timing/DOM untouched; all 320 existing tests stay green.

## Out of scope

- Orientation-adaptive shell / wiring `computeLayout` (iteration 27).
- Moving the callout into the landscape side panel (there is no side panel until 27; centring-in-safe-box is correct for the current vertical stack and remains correct after 27).

## Test plan

- `tests/board.test.ts` — new `describe('board.css — safe area')`: `#app` declares `padding-<side>: max(var(--screen-pad), env(safe-area-inset-<side>))` for top/right/bottom/left.
- `tests/combo.test.ts` (new) — `.combo-callout` top uses `max(... env(safe-area-inset-top))`; horizontal centring references `env(safe-area-inset-left)` and `env(safe-area-inset-right)`; the old raw `top: var(--screen-pad);` is gone; no `font-family` in the file.
- `tests/pwa.test.ts` — `index.html` contains `viewport-fit=cover`.

## Files

- `src/styles/board.css`
- `src/styles/combo.css`
- `tests/board.test.ts`, `tests/combo.test.ts` (new), `tests/pwa.test.ts`

## What landed

- `src/styles/board.css` — `#app` padding split into four per-side `max(var(--screen-pad), env(safe-area-inset-<side>))` declarations. HUD/board/tray now clear the notch, Dynamic Island, side cutouts and home indicator in both orientations.
- `src/styles/combo.css` — callout `top` → `max(var(--screen-pad), env(safe-area-inset-top))` (never under the camera again); `left` → `calc(50% + (env(safe-area-inset-left) - env(safe-area-inset-right)) / 2)` (centred within the safe box, correct with a landscape side cutout). Dropped the duplicated `font-family` (inherits from `body`). `transform`/`comboPulse` keyframe untouched.
- Tests: `tests/combo.test.ts` (new, 4 tests), `tests/board.test.ts` `+describe('board.css — safe area')` (5 tests), `tests/pwa.test.ts` `+1` viewport-fit lock. 330 passed / 0 failed (18 files); typecheck green. No JS/behaviour change.

## Verifier outcome

Self-verified (CSS-only, small blast radius): all 6 ACs ✓ against the written files; old raw `top: var(--screen-pad);` and `padding: var(--screen-pad);` confirmed absent; `viewport-fit=cover` present in `index.html` so `env()` resolves on device. Live re-test of issue #1 (notch overlap) deferred to the user on iPhone after deploy.

## Next — iteration 27

Orientation-adaptive shell + wire `computeLayout` (fixes layout issue #2, landscape unusable). Must resolve the carried `hudExtent` single-scalar risk from iteration 25 by measuring the HUD's relevant extent per orientation.
