# Iteration 8 — Drag and drop (no live preview)

**Date:** 2026-05-13.
**Status:** Complete.

## Goal

Wire Pointer Events so the player can pick a tray piece, drag it with their finger/mouse, and drop it on the board. On a legal release, the controller's `game.place(...)` runs. On an illegal release (off-board, occupied cell, or piece extending past the edge), the drag cancels and the slot restores.

Live placement preview (green/red cell highlighting under the dragged piece) is **iteration 9** — separated because it's pure DOM polish on top of an already-working drop. Anchor offset above the touch point (SPEC §7 nicety for iPad) is also deferred.

## Acceptance criteria

1. `src/drag.ts` exports `createDrag(game: GameApi, trayEl: HTMLElement, boardEl: HTMLElement): DragApi` and the `DragApi` type.
2. `DragApi.destroy(): void` removes every event listener the controller attached.
3. Pointer Events are split: `pointerdown` is attached to `trayEl` (so only piece-on-tray taps trigger pickup), while `pointermove`, `pointerup`, and `pointercancel` are attached to `document` (so the pointer can move anywhere on screen while dragging without needing `setPointerCapture` to route events). The board element parameter is reserved for iteration 9 (preview); the drag controller does not bind to it yet.
4. On `pointerdown` targeting a `.tray__slot` whose piece is non-null:
   - A `<div class="ghost">` is appended to `document.body`. It contains the piece's cells as `.ghost__cell` elements laid out in a CSS Grid sized by `--cell-size` (board scale, so the ghost previews what the placed piece will look like). Each cell carries the family colour via `--piece-color`.
   - The slot gets `data-picked="true"`.
   - The pointer is captured on the slot via `setPointerCapture`.
5. On `pointerdown` targeting a slot whose piece is `null`: no ghost is created, no capture occurs, no state changes.
6. On `pointermove` during an active drag, the ghost's inline `transform` is updated to `translate3d(<clientX>px, <clientY>px, 0)`. Position is in viewport coordinates; the ghost's top-left tracks the pointer 1:1 in iteration 8 (no offset, kept simple).
7. On `pointerup` during an active drag:
   - The controller queries `document.elementsFromPoint(clientX, clientY)` for a `.board__cell`.
   - If a cell is found AND `canPlace(game.boardState, piece, cell.row, cell.col)` returns `true`, the controller calls `game.place(slotIndex, cell.row, cell.col)`.
   - Otherwise, the drag cancels: no placement, slot restored.
   - In both cases: the ghost element is removed from the DOM, and `data-picked` is removed from the slot.
8. `pointercancel` behaves like `pointerup` for cleanup (ghost removed, slot restored) but **never** places.
9. After `destroy()` is called, dispatching a fresh `pointerdown` on a slot does not start a drag.
10. New tokens in `src/styles/tokens.css`:
   - `--z-ghost` for the ghost element's stacking layer.
   - `--ghost-opacity` for ghost translucency (kept distinct so it can be tuned independently of clears/previews).
11. New stylesheet `src/styles/drag.css`:
   - `.ghost`: `position: absolute; top: 0; left: 0; pointer-events: none; z-index: var(--z-ghost); display: grid; gap: var(--cell-gap); will-change: transform; opacity: var(--ghost-opacity);` plus grid-template-columns/rows from `--bbox-w`/`--bbox-h` × `--cell-size`.
   - `.ghost__cell`: `background: var(--piece-color); border-radius: var(--radius);`.
   - `.tray__slot[data-picked='true'] .tray__piece`: `opacity: 0;` (slot looks empty while picked up; cancel will restore it on `pointerup`).
12. `src/main.ts` instantiates `createDrag(game, trayEl, boardEl)` after `game.mount(app)` so the page is fully wired.

## Out of scope (deferred)

- Live placement preview (`preview-ok`/`preview-bad` highlighting on board cells under the dragged piece) — iteration 9.
- Anchor offset above the touch point (SPEC §7 iPad nicety) — later.
- Cancel-back-to-tray animation — later (right now the slot just re-appears when `data-picked` is removed).
- Multi-touch handling beyond first-pointer-wins (subsequent pointerdowns are ignored while a drag is active).
- Touch-vs-mouse distinction (Pointer Events unify them).

## Test plan (Vitest unit, jsdom)

`tests/drag.test.ts`. Hit-testing is exercised by spying on `document.elementsFromPoint` and returning a controlled element list. PointerEvents are dispatched as `new PointerEvent('pointerdown', { pointerId, clientX, clientY, bubbles: true })`.

Tests:

- **starts a drag on a filled slot:** dispatch `pointerdown` on `.tray__slot[data-slot-index="0"]`. Assert `document.body.querySelector('.ghost')` exists, the slot has `data-picked="true"`, and the ghost contains the right number of `.ghost__cell` elements.
- **does not start a drag on an empty slot:** place piece in slot 0 to empty it, then `pointerdown` on slot 0 — no ghost.
- **ghost follows pointer:** start drag, dispatch `pointermove` with `clientX=120, clientY=80`. Assert the ghost's inline `transform` contains `translate3d(120px, 80px, 0)`.
- **drop on a legal cell calls `game.place`:** spy on `elementsFromPoint`, return a `.board__cell` at (3, 3). With a known piece in slot 0, dispatch `pointerup`. Assert `game.boardState[3][3]` (or wherever the piece lands) is filled; ghost removed; slot's `data-picked` gone.
- **drop on an illegal cell does not place:** pre-fill a cell in `game.boardState` (via a prior `game.place`). Spy on `elementsFromPoint` to return that filled cell. Dispatch `pointerup`. Assert no second placement; ghost removed; slot has its piece back (no `data-picked`).
- **drop off-board does not place:** `elementsFromPoint` returns elements without `.board__cell`. Assert no placement, ghost removed, slot restored.
- **drop extending past the edge does not place:** with a multi-cell piece, target a near-edge cell where the piece would extend off the board. Assert `canPlace` correctly rejects and no placement happens.
- **pointercancel cleans up without placing:** start drag, dispatch `pointercancel`. Ghost removed, slot restored, no placement.
- **destroy disables drag:** call `dragApi.destroy()`, dispatch `pointerdown` on a slot. Assert no ghost is created.
- **second pointer ignored during active drag:** start drag with `pointerId=1`; dispatch `pointerdown` with `pointerId=2` on another slot. Assert only one ghost in the DOM.

## What landed

- `src/drag.ts` — closure factory `createDrag(game, trayEl, _boardEl)` returning `{ destroy() }`. Tracks one `ActiveDrag` at a time; rejects re-entrant pickups and pointer ids that don't match the active drag. `setPointerCapture` wrapped in `try/catch` because jsdom and some browsers stub it.
- `src/styles/drag.css` — `.ghost` and `.ghost__cell` styling (tokens only); `.tray__slot[data-picked='true'] .tray__piece { opacity: 0 }` so the slot looks empty while picked up.
- `src/styles/tokens.css` — `--z-ghost: 1000` and `--ghost-opacity: 0.85`.
- `src/main.ts` — instantiates `createDrag` after `game.mount(app)`.
- `tests/setup.ts` (new) — polyfills `PointerEvent`, `setPointerCapture` / `releasePointerCapture`, and `document.elementsFromPoint`, all missing from jsdom 25. Test-only; production code in `src/drag.ts` does not depend on the polyfill being present.
- `vitest.config.ts` — wires `setupFiles: ['./tests/setup.ts']`.
- `tests/drag.test.ts` — 11 tests across pickup, motion, legal drop, illegal drop (two paths), pointercancel, and destroy.
- `tests/tokens.test.ts` — extended with a `--z-ghost` / `--ghost-opacity` declaration check.

## Verifier findings

- AC3 was tightened to match the actual code (pointerdown on `trayEl`, the other three on `document`); the rationale is documented above.
- All other ACs satisfied. No magic numbers in CSS, no `any`, no unsafe casts in source, no animated layout properties, Pointer Events only (SPEC §7), `elementsFromPoint`-only hit-testing (SPEC §7).
- Theoretical listener leak on `document` if `dragApi.destroy()` is never called and a future "New game" recreates state — flagged for the iteration that adds game reset.

## Final state

- Vitest: 128 passed / 0 failed (10 files).
- Typecheck: green.
- Playwright: not run.

## Deferred follow-ups (verifier suggestions)

1. Iteration 9: live preview — wire the `_boardEl` argument; on pointermove apply `data-state="preview-ok"` / `"preview-bad"` to the predicted landing cells.
2. iPad finger offset (SPEC §7): a `--ghost-offset-y` token, gated on `pointerType === 'touch'`, so the piece sits above the fingertip.
3. Pair `createGame` with a `destroy()` lifecycle so a future "New game" can clean up both controllers atomically.

## Next — iteration 9

Live placement preview. While dragging, for the candidate anchor under the pointer, set `data-state="preview-ok"` on each landing cell when `canPlace` is true, and `data-state="preview-bad"` on every cell of the piece (mapped onto the closest in-bounds anchor, or just the cell under the pointer) when it would not fit. Clear all preview state on each move, drop, cancel, and destroy.
