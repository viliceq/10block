# Iteration 4 — Engine: board state and `canPlace`

**Date:** 2026-05-13.
**Status:** Complete.

## Goal

Introduce the engine layer: a pure-data representation of the board and the first engine function, `canPlace`. This is the smallest engine slice that unblocks drag-and-drop in iteration 5 (the drag layer will call `canPlace` on every pointer-move to compute the live preview state). No DOM, no rendering — pure logic only.

## Acceptance criteria

1. `src/engine.ts` exports a `CellState` type: `null` (empty) or `PieceFamily` (filled, carrying the colour).
2. `src/engine.ts` exports a `BoardState` type: `ReadonlyArray<ReadonlyArray<CellState>>`. The convention is `board[row][col]`.
3. `src/engine.ts` exports `createEmptyBoard(): BoardState` returning a fresh 10×10 board of all `null`.
4. `src/engine.ts` exports `canPlace(board: BoardState, piece: Piece, anchorRow: number, anchorCol: number): boolean`.
5. **Anchor convention:** the anchor is where the piece's bbox origin `(0, 0)` lands. Piece cell `(r, c)` therefore lands at `(anchorRow + r, anchorCol + c)`.
6. `canPlace` returns `true` iff *every* cell of the piece lands at an in-bounds, empty board cell.
7. `canPlace` returns `false` if any landing cell is out of bounds (row < 0, row ≥ 10, col < 0, col ≥ 10).
8. `canPlace` returns `false` if any landing cell is already filled.
9. `canPlace` does not mutate the board or the piece.
10. `createEmptyBoard` returns independent arrays on each call (mutating one row of one board should not affect another board — defensive freshness, even though `BoardState` is typed `readonly`).

## Out of scope

- Placement (mutating the board to apply a piece) — iteration 5 or 6.
- Clearing rows/columns — later iteration.
- Drag-and-drop layer — iteration 5.
- Game-over detection — later iteration.
- Scoring — later iteration.

## Test plan

- **Vitest unit (`tests/engine.test.ts`):**
  - `createEmptyBoard()` returns a 10×10 grid of `null`.
  - `createEmptyBoard()` returns independent grids.
  - `canPlace`: single at (0,0), (9,9), (5,5) on an empty board → `true`.
  - `canPlace`: single at (-1, 0), (0, -1), (10, 0), (0, 10) → `false`.
  - `canPlace`: penta-h at (0, 0) → `true`; at (0, 5) → `true`; at (0, 6) → `false` (would extend to col 10).
  - `canPlace`: penta-v at (5, 0) → `true`; at (6, 0) → `false`.
  - `canPlace`: `square-3` at (0,0) → `true`; at (7, 7) → `true`; at (8, 0) → `false`; at (0, 8) → `false`.
  - `canPlace`: L-shape coverage — `l2-ne` at (0, 9) → `false` (one cell would land at column 10); at (0, 8) → `true`.
  - `canPlace`: overlap rejection — a board with `(3, 3)` filled; `single` at (3, 3) → `false`; at (3, 4) → `true`.
  - `canPlace`: multi-cell overlap — square-2 at (3, 3) on a board where only `(4, 4)` is filled → `false`.
  - Purity: snapshot the board before and after a call to `canPlace`; expect deep equality.

## What landed

- `src/engine.ts` — `CellState`, `BoardState`, `BOARD_SIZE`, `createEmptyBoard()`, `canPlace(board, piece, anchorRow, anchorCol)`. All pure, no DOM.
- `src/board.ts` — now imports `BOARD_SIZE` from `engine.ts`; single source of truth.
- `tests/engine.test.ts` — 15 tests across `createEmptyBoard` (3) and `canPlace` (12), covering bounds, anchor maths, overlap, sparse-bbox holes (l2-nw + l3-ne), exhaustive purity.
- `CONTEXT.md` — added entries for **BoardState**, **CellState**, **Anchor**, and **canPlace** so future iterations use the same vocabulary.

## Verifier findings (acted on)

- L3-sparseness test was missing → added `ignores l3 bbox holes (sparse 3x3 piece)`.
- New engine vocabulary not yet in glossary → added to `CONTEXT.md`.
- Other findings (the two `as` widening casts, the `if (!boardRow)` narrowing pacifier) are acceptable given `noUncheckedIndexedAccess`; left as-is. None violate conventions.

## Final state

- Vitest: 84 passed / 0 failed (8 files).
- Typecheck: green.
- Playwright: not run.

## Next — iteration 5

`applyPlacement(board, piece, anchorRow, anchorCol): BoardState` — pure, returns a new board with the piece's cells set to its family. Sibling to `canPlace`; together they make placement self-contained without yet touching the DOM. Iteration 6 will then wire the engine to the DOM (mark cells `filled`, set `--piece-color` on cells).
