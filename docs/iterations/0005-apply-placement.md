# Iteration 5 — Engine: `applyPlacement`

**Date:** 2026-05-13.
**Status:** Complete.

## Goal

Add `applyPlacement` — the pure sibling of `canPlace`. Given a board, piece, and anchor, return a new board with the piece's cells set to its family colour. Throw if the placement is illegal so the contract is loud rather than silently producing a corrupt board.

Still no DOM. Iteration 6 will wire the engine to the visible board (`data-state="filled"`, `--piece-color`).

## Acceptance criteria

1. `src/engine.ts` exports `applyPlacement(board: BoardState, piece: Piece, anchorRow: number, anchorCol: number): BoardState`.
2. Returns a `BoardState` whose top-level reference is different from the input (`new !== old`).
3. For every cell `(r, c) ∈ piece.cells`, the returned board has `family` at `(anchorRow + r, anchorCol + c)`.
4. Every other cell in the returned board equals the corresponding cell in the input board.
5. The input board is not mutated by the call (deep equality with the pre-call snapshot).
6. Throws an `Error` with a message naming the piece and anchor if `canPlace(board, piece, anchorRow, anchorCol)` would return `false`.
7. On throw, the input board is still not mutated.
8. Sequential placements compose: `applyPlacement(applyPlacement(empty, A, ar, ac), B, br, bc)` yields a board containing both pieces' cells (when both are legal).

## Out of scope

- DOM updates / cell visualisation.
- Clearing full rows or columns.
- Removing the piece from the tray (drag layer's job).
- Animation.

## Test plan

Extend `tests/engine.test.ts` with a new `describe('applyPlacement()', ...)` block:

- Returns a new top-level board reference.
- Single piece at (3, 3) → returned board has `'single'` at (3, 3), `null` elsewhere; input snapshot unchanged.
- Square-2 at (4, 5) → all four target cells are `'sq2'`; input snapshot unchanged.
- L3-NE at (0, 0) → exactly its five cells become `'l3'`; the bbox holes (0,1), (0,2), (1,1), (1,2) remain `null`.
- Throws when placing single at (10, 0) (out of bounds); input snapshot unchanged on throw.
- Throws when placing square-2 on a board where (3, 3) is already filled, with anchor (3, 3); input snapshot unchanged on throw.
- Throws with an error message containing the piece id and anchor coordinates.
- Sequential composition: two non-overlapping pieces applied in sequence → both present in the final board.

## What landed

- `src/engine.ts` — added `applyPlacement(board, piece, anchorRow, anchorCol)`. Delegates legality to `canPlace`; throws before any allocation; otherwise returns a fresh `BoardState` via `board.map(row => row.slice())`, then writes piece cells.
- `tests/engine.test.ts` — added 11 tests in a new `applyPlacement()` describe block: top-level reference change, single/square-2/l3-ne fill correctness, untouched neighbours, two purity tests (success + throw paths), throw-message assertion, two-placement composition with intermediate-board deep-equality snapshot.

## Verifier findings (acted on)

- Test cast `(err as Error).message` replaced with `err instanceof Error ? err.message : String(err)` narrowing.
- Composition test strengthened from a single cell-equality check to a full deep-equality snapshot of the intermediate board.

## Final state

- Vitest: 95 passed / 0 failed (8 files).
- Typecheck: green.
- Playwright: not run.

## Next — iteration 6

Wire the engine to the DOM. Smallest meaningful slice: a pure DOM helper `renderBoardState(boardElement, boardState)` that reads each cell's `data-row`/`data-col` and updates `data-state` + `--piece-color` to reflect the engine state. Unit-testable in jsdom; no input yet. After this, iteration 7 begins the drag/drop layer that calls `canPlace` for live preview and `applyPlacement` on drop.
