# Iteration 33 — HUD fits 4+ digit scores without overflow

**Date:** 2026-05-21.
**Status:** Complete.

## Verifier outcome

378 vitest + typecheck + 6 e2e green (incl. the new `hud-overflow.spec.ts` regression that asserts 5-digit SCORE/BEST do **not** cause `documentElement.scrollWidth > innerWidth` and that the HUD's measured width equals the board's). Screenshot-verified in WebKit at iPhone-portrait viewport for both 4-digit and 5-digit scores.

## Bug

In iPhone portrait, once both SCORE and BEST reach 4 digits, the HUD's row of `[SCORE 1234] [BEST 9999] [Mute]` no longer fits the safe content width. The HUD pushes `#app`'s `grid-template-columns: min-content` wider than the board, the page horizontally scrolls, and the board's on-screen position drifts from the binder's computed value — so drop hit-tests go off by the scroll delta.

## Fix

Same playbook as the v29.2 tray fix:

1. **Pin the HUD to `var(--board-size)` in portrait** (`box-sizing: border-box`) so it can never outgrow the column, mirroring how the tray is pinned. Landscape (side panel, content-sized) is unchanged.
2. **Stack each pair vertically** — small label *above* the big tabular-numeric score — so two pairs + mute fit comfortably in the board width with plenty of headroom for 5+ digit scores. The HUD still "lays out as a row in portrait" per SPEC §8.7 (the row is `pair | pair | mute`); only the *internal* layout of each pair becomes column-stacked. Preserves the 40px score from SPEC §8.6.
3. Internal grid is `1fr 1fr auto` with `min-width: 0` so any residual overflow shrinks gracefully rather than triggering page scroll.

No change in landscape; no JS change.

## Acceptance criteria

1. `#app[data-orientation='portrait'] .hud { width: var(--board-size); box-sizing: border-box }`.
2. HUD inner layout: `.hud { grid-template-columns: 1fr 1fr auto; min-width: 0 }`; `.hud__pair` stacked column (label above score), `min-width: 0`.
3. With `SCORE = 99999` and `BEST = 99999`, the iPhone-portrait page has **no horizontal scroll** (`documentElement.scrollWidth ≤ innerWidth`). Verified via WebKit e2e.
4. Landscape unaffected (side panel keeps its content-sized arrangement).
5. SPEC §8.7 note that each pair stacks in portrait; SPEC §8.6 unchanged (score still 40px).
6. Full unit + e2e + typecheck green. `APP_VERSION` → `v33`.

## Files

- `src/styles/hud.css`, `src/styles/board.css` (portrait width pin lives next to the tray's, so it's covered by the existing `board.test.ts` orientation-grid describe)
- `tests/board.test.ts` (CSS-content assertion for the HUD portrait pin)
- `tests/e2e/hud-overflow.spec.ts` (new — pins the regression in real WebKit)
- `src/version.ts`
