# Iteration 9 — Live placement preview

**Date:** 2026-05-13.
**Status:** Complete.

## Goal

While a piece is being dragged, light up the board cells where it would land. Green tint (`data-state="preview-ok"`) if the placement is legal; red tint (`data-state="preview-bad"`) if not. Preview clears the instant the pointer leaves the board, the drag ends, or `destroy()` is called.

Wires the previously-unused `boardEl` argument from iteration 8 into the drag controller.

## Acceptance criteria

1. `createDrag(game, trayEl, boardEl)` now uses `boardEl` (drops the `_` prefix); types and the signature are otherwise unchanged.
2. On `pointermove` during an active drag:
   - The controller first calls `renderBoardState(boardEl, game.boardState)` to wipe any stale preview from the previous move.
   - It then resolves a candidate anchor via `document.elementsFromPoint`. If no `.board__cell` is under the pointer, no preview is applied.
   - If a target cell is found, the anchor is `(cell.row, cell.col)` — same convention as drop in iteration 8.
   - For every cell of the active piece, the controller computes the absolute landing coordinate `(anchorRow + r, anchorCol + c)`. If that coordinate is in-bounds, the corresponding `.board__cell`'s `data-state` is set to `"preview-ok"` (when `canPlace` is true) or `"preview-bad"` (otherwise). Out-of-bounds coordinates are silently skipped.
3. Preview is cleared by `renderBoardState` calls in **every** ending branch:
   - Legal drop: `game.place` triggers a render which overrides any preview.
   - Illegal drop: controller calls `renderBoardState(boardEl, game.boardState)` before cleanup.
   - `pointercancel`: same as illegal drop.
   - `destroy()` mid-drag: same.
4. `src/styles/board.css` gains two rules — `.board__cell[data-state='preview-ok']` and `.board__cell[data-state='preview-bad']` — each painting `var(--color-preview-ok)` / `var(--color-preview-bad)` respectively. No new tokens needed (both already exist from iteration 1).
5. Preview-bad cells override a `data-state="filled"` cell visually — the red overlay supersedes the family colour. (This is a consequence of how `data-state` is mutually exclusive; SPEC §8.2 explicitly enumerates these as alternative values.)
6. The candidate-anchor algorithm matches drop exactly so what the player sees during drag is what they get on release.

## Out of scope (deferred)

- Pointer offset above touch point (still SPEC §7's iPad nicety; later iteration).
- Animations of preview entering/leaving.
- Row/column clears (next major slice).

## Test plan

Extend `tests/drag.test.ts` with a new `describe('createDrag — preview', ...)` block. `document.elementsFromPoint` is mocked per case.

- **preview-ok on legal anchor:** start drag on slot 0, mock `elementsFromPoint` to return cell (3, 3), dispatch `pointermove`. Assert: every cell of the piece (mapped by `[anchorRow+r, anchorCol+c]`) has `data-state="preview-ok"`. Count of preview-ok cells equals `piece.cells.length`.
- **preview-bad on illegal anchor (overlap):** pre-place slot 0 at (0, 0); now drag slot 1; mock `elementsFromPoint` to return a cell at an anchor where `canPlace` says false; assert preview-bad cells = piece's in-bounds cell count, and zero preview-ok cells.
- **preview-bad clamped on edge:** drag a piece with bbox > 1 in some dimension; target a near-edge cell so some piece cells fall off-board; assert preview-bad cells equal only the *in-bounds* piece cells (not the count of piece cells overall).
- **preview clears on off-board pointermove:** start drag, pointermove over cell (3,3) → preview cells > 0; then pointermove with `elementsFromPoint` returning `[]` → preview cells = 0.
- **preview clears between moves:** first pointermove targets (3,3), second targets (5,5) with the same piece; assert no cell still carries preview-ok from the first move's anchor (i.e., the *only* cells with preview-* are those at the second move's coords).
- **preview clears on legal drop:** start drag, pointermove for preview, pointerup; assert no cell carries `data-state="preview-*"`.
- **preview clears on illegal drop:** start drag, pointermove over an illegal cell, pointerup; assert no cell carries `data-state="preview-*"`.
- **preview clears on pointercancel:** start drag, pointermove for preview, pointercancel; assert no cell carries `data-state="preview-*"`.
- **preview clears on destroy mid-drag:** start drag, pointermove for preview, call `drag.destroy()`; assert no cell carries `data-state="preview-*"`.

## What landed

- `src/drag.ts` — `boardEl` now active. `onPointerMove` calls a new `updatePreview(x, y)` that:
  1. Re-renders engine state to wipe any prior preview.
  2. Resolves the target cell via `findBoardCell`.
  3. Decides `preview-ok` / `preview-bad` via `canPlace`.
  4. Applies the chosen `data-state` to each in-bounds landing cell.
  `finishDrag` skips `clearPreview` after a legal placement (game.place already re-rendered) and otherwise calls it; `destroy` calls it during in-flight cleanup.
- `src/styles/board.css` — two new selectors painting `var(--color-preview-ok)` / `var(--color-preview-bad)`. No new tokens (both predate iteration 9).
- `tests/drag.test.ts` — 9 new preview tests covering legal anchor, illegal anchor, edge clamping, off-board clear, between-move clear, and the four end-of-drag branches.

## Verifier findings

- All 6 acceptance criteria satisfied.
- No convention violations. `BOARD_SIZE` imported (no literal `10` in `drag.ts`); only animated property remains `background` (no layout animation introduced).
- L3-NE near-edge bounds-skip traced and confirmed: out-of-bounds piece cells are silently skipped; the in-bounds ones get `preview-bad`.
- Legal-drop has no double-render (no flicker); `placed` flag guards a redundant `clearPreview`.
- The `mockImplementation` workaround for two tests was confirmed a clean test-side fix, not masking a production bug (`elementsFromPoint` is called exactly once per pointermove and once per pointerup).

## Final state

- Vitest: 137 passed / 0 failed (10 files).
- Typecheck: green.
- Playwright: not run.

## Deferred follow-ups (verifier suggestions)

1. Pointer offset above the touch point (SPEC §7 iPad nicety).
2. Cache `boardEl.querySelectorAll('.board__cell')` once per drag — marginal optimisation.
3. **Row/column clears** — the next major slice; the engine still does not remove full rows/columns after a placement.

## Next — iteration 10

Engine clears. `resolveClears(board): { board: BoardState; rowsCleared: ReadonlyArray<number>; colsCleared: ReadonlyArray<number> }` — pure function. Identifies all fully filled rows and columns and returns a new board with them removed in one pass (so a cell that belongs to both a full row and a full column is cleared once). After this, iteration 11 wires it into `game.place` and renders the clearing animation; iteration 12 adds scoring on top.
