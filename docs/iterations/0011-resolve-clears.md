# Iteration 11 — Engine: `resolveClears`

**Date:** 2026-05-13.
**Status:** Complete.

## Goal

A pure engine function that detects all fully filled rows and columns on a board and returns a new board with them removed. Rows and columns are resolved **simultaneously** — a cell that is part of both a full row and a full column is cleared once (it ends up `null` in the new board). No DOM, no rendering, no game state.

This is the building block for the game's core scoring loop: iteration 12 will wire it into `game.place`; iteration 13 will translate `rowsCleared.length + colsCleared.length` into the SPEC §5 line-clear bonus.

## Acceptance criteria

1. `src/engine.ts` exports `resolveClears(board: BoardState): ClearResult` and the `ClearResult` type:

   ```
   type ClearResult = {
     readonly board: BoardState;
     readonly rowsCleared: ReadonlyArray<number>;
     readonly colsCleared: ReadonlyArray<number>;
   };
   ```

2. `rowsCleared` lists every row index `r ∈ [0, 10)` where `board[r][c] !== null` for all `c ∈ [0, 10)`. Sorted ascending.

3. `colsCleared` lists every column index `c` where `board[r][c] !== null` for all `r ∈ [0, 10)`. Sorted ascending.

4. In the returned `board`, every cell `(r, c)` where `r ∈ rowsCleared` OR `c ∈ colsCleared` is set to `null`. All other cells equal the input board's value.

5. A cell that is in both a full row and a full column is set to `null` once (not double-cleared, but the outcome is identical — verified by the equality check above).

6. The function does not mutate the input board.

7. The returned board has a different top-level reference than the input (`resolveClears(b).board !== b`).

8. Edge cases:
   - **Empty board:** `rowsCleared = []`, `colsCleared = []`, `board` deep-equals the input.
   - **Full board (every cell non-null):** `rowsCleared = [0..9]`, `colsCleared = [0..9]`, every cell of the returned board is `null` (a perfect clear).
   - **Exactly one full row, no full columns:** `rowsCleared = [r]`, `colsCleared = []`, only row `r` becomes nulls.
   - **One full row + one full column:** both arrays carry one entry; the row and column cells are nulled; the intersection cell is nulled (once).

## Out of scope

- Scoring computation (iteration 13).
- Wiring into `game.place` (iteration 12).
- Clearing animation (later).
- "Perfect-clear bonus" detection (iteration 13 will compute it from the resulting empty board).

## Test plan

Extend `tests/engine.test.ts` with a new `describe('resolveClears()', ...)` block.

- **empty board:** no rows/cols cleared, deep equality preserved, top-level reference differs.
- **single full row:** prefill row 4 with `'single'` in every column; assert `rowsCleared = [4]`, `colsCleared = []`, board row 4 all null, other rows untouched.
- **single full column:** prefill column 7 in every row; assert `colsCleared = [7]`, that column nulled, rows untouched outside col 7.
- **simultaneous row + column:** prefill row 2 entirely with `'sq2'` and column 5 entirely with `'l3'`; assert `rowsCleared = [2]`, `colsCleared = [5]`, intersection `(2,5)` is null in the new board, everything else outside the row/col untouched.
- **multiple rows:** prefill rows 1, 4, 9; assert `rowsCleared = [1, 4, 9]` (sorted), `colsCleared = []`.
- **multiple columns:** prefill columns 0, 5; assert `colsCleared = [0, 5]`.
- **full board → perfect clear:** every cell filled; assert `rowsCleared = [0..9]`, `colsCleared = [0..9]`, board is entirely null.
- **purity / immutability:** snapshot the input board; run `resolveClears`; assert deep equality of the input snapshot afterwards.
- **top-level reference differs:** even when nothing is cleared, the returned board is not the same reference as the input.

## What landed

- `src/engine.ts` — added `ClearResult` type and `resolveClears(board)` function. The algorithm scans rows then columns (each with a `for` + `noUncheckedIndexedAccess`-pacifier guards), builds row/column index sets, then rebuilds the board via `board.map((row, r) => row.map((cell, c) => (rowSet.has(r) || colSet.has(c) ? null : cell)))`. Row + column intersection is naturally cleared once via the OR check.
- `tests/engine.test.ts` — 9 new tests under a `resolveClears()` describe block, plus three new local helpers (`fillRow`, `fillCol`, `fillEvery`).
- `CONTEXT.md` — added `ClearResult` entry alongside `BoardState`/`CellState`/`Anchor`/`canPlace`.

## Verifier findings (acted on)

- `ClearResult` was off-vocabulary → added to glossary.
- Stylistic inconsistency between `=== null` (canPlace/applyPlacement) and `cell === null || cell === undefined` (resolveClears): noted, intentionally left because both patterns are well-defined for a well-formed 10×10 board; consistency pass deferred.
- Helper duplication with `withFilled`: each helper has a distinct shape; consolidation deferred until iteration 12 (when `tests/game.test.ts` will likely want the same fixtures).

## Final state

- Vitest: 149 passed / 0 failed (10 files).
- Typecheck: green.
- Playwright: not run.

## Next — iteration 12

Wire `resolveClears` into `game.place`. After `applyPlacement`, the controller calls `resolveClears`, replaces its `BoardState` with the result, and re-renders. This makes full rows/columns disappear visibly on a placement. Animation of the clear is left for a follow-up (it's an opacity transition on the cleared cells; reduced-motion-aware).
