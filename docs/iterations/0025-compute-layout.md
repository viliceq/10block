# Iteration 25 — `computeLayout` pure function

**Date:** 2026-05-16.
**Status:** Complete.

## Goal

The pure, DOM-free core of the SPEC §8.1/§8.9 layout rework: given the viewport, safe-area insets, and the static spacing tokens, decide the orientation and the integer-pixel board/tray sizing. No browser, no CSS, no wiring — just deterministic math, exhaustively table-tested. De-risks the hard part before any structural change ships (no user-visible change this iteration).

## Model

Safe content box (insets folded with the screen-pad token, per SPEC §8.9 `max(token, env)`):

```
padL = max(screenPad, insetLeft)   padR = max(screenPad, insetRight)
padT = max(screenPad, insetTop)    padB = max(screenPad, insetBottom)
contentW = viewportWidth  − padL − padR
contentH = viewportHeight − padT − padB
orientation = contentW > contentH ? 'landscape' : 'portrait'
```

Board container side `B = 2·boardPad + 10·cell + 9·gap`.

- **Portrait** — board fills the safe **width**: `rawCell = floor((contentW − 2·boardPad − 9·gap) / 10)`. The auxiliary (HUD + tray) consumes height; if `hudExtent + B + traySlotSize > contentH`, `overflow = true` (page scrolls — board never clips, SPEC §8.9).
- **Landscape** — board fills the safe **height**: `rawCell = floor((contentH − 2·boardPad − 9·gap) / 10)`. The side panel consumes width; `panelWidth = max(hudExtent, traySlotSize)`; if `B + panelWidth > contentW`, `overflow = true`.
- **Floor:** `cell = max(minCell, rawCell)`; `overflow ||= rawCell < minCell` (degenerate viewport → clamp up, accept scroll).
- **Tray (derived, pure):** `trayCellSize = max(1, floor(cell · trayScale))`; `traySlotSize = 5·trayCellSize + 4·gap` (holds the largest 5-cell piece).

All returned sizes are integers; `B` is reconstructed from the integer `cell` so the remainder (`budget − B`) is even outer margin — no sub-pixel cell distribution (the day-one invariant).

## Acceptance criteria

1. `src/layout.ts` exports `computeLayout(input: LayoutInput): Layout`, plus the `LayoutInput`, `Layout`, and `Orientation` types.
2. `LayoutInput`: `viewportWidth`, `viewportHeight`, `insetTop/Right/Bottom/Left`, `screenPad`, `boardPad`, `gap`, `minCell`, `hudExtent`, `trayScale` (all `number`, readonly).
3. `Layout`: `orientation` (`'portrait'|'landscape'`), `cellSize`, `boardSize`, `trayCellSize`, `traySlotSize` (all integer px), `overflow` (boolean).
4. Safe content box folds insets with `screenPad` via per-side `max`, per SPEC §8.9.
5. Orientation: `contentW > contentH → 'landscape'`, else `'portrait'` (square ⇒ portrait).
6. Portrait sizes the board from `contentW`; landscape from `contentH`, per the model above.
7. `cellSize` is always a positive integer ≥ `minCell`. `boardSize === 2·boardPad + 10·cellSize + 9·gap` exactly.
8. `trayCellSize === max(1, floor(cellSize · trayScale))`; `traySlotSize === 5·trayCellSize + 4·gap`.
9. `overflow` is `true` iff the auxiliary doesn't fit the unconstrained dimension **or** `rawCell` was clamped up to `minCell`.
10. Pure: same input → deep-equal output; no mutation of the input; no globals, no DOM.
11. Degenerate inputs (zero/negative viewport) do not throw; they return `cellSize === minCell`, `overflow === true`.

## Test plan

`tests/layout.test.ts` — table-driven over realistic devices, plus invariants:

- iPhone SE portrait `375×667`, no insets.
- iPhone 15 portrait `393×852`, insets `top 59` (Dynamic Island), `bottom 34`.
- iPhone 15 **landscape** `852×393`, insets `left 59, right 59, bottom 21` → orientation landscape, board sized from `contentH`, `B + panel ≤ contentW`, `overflow === false` (the bug this whole rework targets).
- iPad portrait `820×1180` and landscape `1180×820`, small insets.
- Degenerate `0×0` and `200×200` → clamped `minCell`, `overflow === true`, no throw.
- Invariants asserted on every case: `Number.isInteger(cellSize/boardSize/trayCellSize/traySlotSize)`, `cellSize ≥ minCell`, `boardSize === 2·boardPad + 10·cellSize + 9·gap`, tray formulae.
- Orientation boundary: `contentW === contentH` (after fold) ⇒ `'portrait'`.
- Inset folding: insets larger than `screenPad` shrink the content box (assert vs. insets smaller than `screenPad`, which don't).
- Purity: two calls deep-equal; input object unchanged (frozen-input test).

## Files

- `src/layout.ts` (new)
- `tests/layout.test.ts` (new)
- `CONTEXT.md` — add **computeLayout** / **Layout** entries.

No DOM, so no `tests/setup.ts` changes; not wired anywhere yet (binder is iteration 27).

## What landed

- `src/layout.ts` (new) — `computeLayout`, `LayoutInput`, `Layout`, `Orientation`. Folds insets with `--screen-pad` per side; aspect-driven orientation; board sized from the constrained dimension as `floor((budget − 2·boardPad − 9·gap)/10)` integer cells; clamps to `minCell` with `overflow` rather than ever clipping; tray sizes derived purely from `cellSize`.
- `tests/layout.test.ts` (new) — 18 tests: orientation, five device profiles, degenerate/negative inputs, safe-area folding, purity, overflow, and the §8.9 board-vs-budget invariant (boardSize ≤ budget when not clamped; boardSize > budget ∧ overflow on a clamped tiny viewport).
- `CONTEXT.md` — added **computeLayout** and **Layout** glossary entries.

## Verifier outcome

Independent verifier: all 11 ACs ✓, no convention findings, all device math hand-recomputed and agreeing with both tests and implementation, degenerate inputs proven NaN/throw-safe, §8.9 whole-pixel/no-clip invariants confirmed. Acted on its two actionable items (CONTEXT.md entries; explicit board-vs-budget invariant tests).

### Carried risk for iteration 27 (the binder) — `hudExtent` is a single scalar

Verifier flag, accepted: `hudExtent` is consumed as a **height** in portrait (`hud + board + traySlot ≤ contentH`) but as a **width** contribution in landscape (`max(hudExtent, traySlotSize)`). A real HUD has different extents per orientation. The binder must therefore measure and pass the HUD's *relevant* extent for the current orientation (or `computeLayout` gains `hudWidth`/`hudHeight`). **Revisit this signature at iteration 27** rather than retrofitting now — `computeLayout` stays pure and correct for its stated contract; only the binder's measurement strategy is affected.

## Final state

- Vitest: 320 passed / 0 failed (17 files). Typecheck green.
- No user-visible change (function not wired); not deployed-relevant.

## Next — iteration 26

Safe-area plumbing + combo-callout reposition: shell padding → `max(token, env(safe-area-inset-*))`; `.combo-callout` anchored within the safe content/HUD region. Independently fixes layout issue #1 (notch overlap) with low blast radius, before the iteration-27 structural rework wires `computeLayout`.
