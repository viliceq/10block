# Iteration 6 — DOM bridge: `renderBoardState`

**Date:** 2026-05-13.
**Status:** Complete.

## Goal

A small DOM helper that reflects a pure `BoardState` onto the board's cells: filled cells get `data-state="filled"` with their family colour as a CSS custom property; empty cells get `data-state="empty"` and any prior colour removed. This is the bridge that future iterations (drag preview, drop, clear animations) will sit on top of.

## Acceptance criteria

1. `src/board.ts` exports `renderBoardState(boardElement: HTMLElement, state: BoardState): void`.
2. For each `.board__cell` inside `boardElement`, the function reads the cell's `data-row` and `data-col`, looks up `state[row][col]`, and applies one of two outcomes:
   - **Empty** (`null`): `data-state = "empty"`, and `--piece-color` is removed from the cell's inline style.
   - **Filled** (`PieceFamily`): `data-state = "filled"`, and `--piece-color = var(--color-piece-<family>)` is set on the cell's inline style.
3. `src/styles/board.css` is updated so that `.board__cell[data-state="filled"]` paints itself with `var(--piece-color)`.
4. Re-rendering replaces prior state: a previously filled cell that is `null` in the new state becomes visually empty and loses its `--piece-color`; a previously empty cell that is filled in the new state becomes visually filled.
5. The function does not mutate the input `BoardState`.
6. The function does not depend on the order in which cells appear in the DOM — it locates each cell via its `data-row`/`data-col`, not via index.

## Out of scope

- Drag-and-drop (iteration 7).
- Animations of clear/place (later).
- Preview states (`preview-ok` / `preview-bad` — those land alongside the drag layer).
- main.ts wiring of any specific demo state.

## Test plan

Extend `tests/board.test.ts` with a new `describe('renderBoardState()', ...)` block, plus extend `tests/tokens.test.ts` if needed (no new tokens this iteration — the family colour tokens already exist).

- Calling `renderBoardState` with `createEmptyBoard()` leaves every cell `data-state="empty"` with no inline `--piece-color`.
- Filling `(3, 4)` with `'single'`: that exact cell becomes `data-state="filled"` and `--piece-color = var(--color-piece-single)`. All other cells stay empty.
- Filling `(0, 0)` with `'sq2'`, `(9, 9)` with `'l3'`, and `(5, 5)` with `'line'`: each cell shows its family's colour token; the rest stay empty.
- Re-render: start filled at `(2, 2)`, then re-render with all empty → `(2, 2)` returns to `data-state="empty"` and inline `--piece-color` is gone.
- Re-render: start empty, then re-render filled at `(2, 2)` → cell becomes filled with the right colour.
- Cell lookup is by `data-row`/`data-col`, not DOM order: shuffling the cells in the DOM before render still produces correct output (assert via a constructed board where children are reordered).
- Input purity: render then deep-equal snapshot of the input `BoardState`.

## What landed

- `src/board.ts` — added `renderBoardState(boardEl, state)`. Locates each cell by `data-row`/`data-col`, sets `data-state` and either applies or removes `--piece-color` via `style.setProperty` / `style.removeProperty`.
- `src/styles/board.css` — added the `.board__cell[data-state='filled']` rule so filled cells paint with `var(--piece-color)`.
- `tests/board.test.ts` — 8 new tests in a `renderBoardState()` describe: empty state, single fill, family colour mapping, fill→empty and empty→fill round-trips, locate-by-attribute (children shuffled), input purity. (Plus a local `withFilled` helper duplicated from `tests/engine.test.ts` — flagged for future DRY extraction.)

## Verifier findings

- All 6 acceptance criteria satisfied.
- No convention violations.
- Rendering correctness sanity passes: partial-state degradation is safe; `removeProperty` (not empty-string assignment) is used; CSS specificity is identical between the base and `[data-state='filled']` rules and source-order ensures the filled rule wins.
- Deferred suggestions: extract `withFilled` to a shared test helper when a third caller arrives; add an explicit state-shape assertion; wire `renderBoardState` into `main.ts` (planned for iteration 7).

## Final state

- Vitest: 103 passed / 0 failed (8 files).
- Typecheck: green.
- Playwright: not run.

## Next — iteration 7

Begin the drag layer. Smallest meaningful slice: a `Game` controller in `src/game.ts` that owns a single `BoardState`, mounts the board + tray, and renders the engine state through `renderBoardState`. No drag input yet — this iteration just moves `main.ts`'s ad-hoc setup behind a tested controller and exposes a `place(slotIndex, anchorRow, anchorCol)` method that calls `applyPlacement` and re-renders. Iteration 8 then attaches Pointer Events.
