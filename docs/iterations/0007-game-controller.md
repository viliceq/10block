# Iteration 7 — Game controller

**Date:** 2026-05-13.
**Status:** Complete.

## Goal

Introduce a `Game` controller that owns the engine state and the tray pieces, and exposes a `place(slotIndex, anchorRow, anchorCol)` method. The controller mounts the board and tray DOM and keeps them in sync with the engine via `renderBoardState` and `renderPieceInSlot`. Refills the tray once all three slots are empty. No pointer-event input yet — input handlers in iteration 8 will simply call `place`.

A closure-based factory (`createGame`) is used rather than a class, to match the codebase's functional style (`createBoard`, `createTray`, etc.) and to keep callbacks `this`-free for the drag layer.

## Acceptance criteria

1. `src/game.ts` exports `createGame(options?: GameOptions): GameApi` and the `GameApi` / `GameOptions` types.
2. `GameOptions.rng` is optional; defaults to `Math.random`.
3. After `createGame()`, `game.boardState` equals an empty board (every cell `null`).
4. After `createGame()`, `game.trayPieces` has exactly `TRAY_SIZE` (3) entries, each a `Piece` from `CATALOG`.
5. `createGame({ rng: seeded })` is deterministic — same seed produces the same initial tray.
6. `game.mount(rootEl)` appends the board element followed by the tray element to `rootEl`. The board precedes the tray in DOM order.
7. `game.place(slotIndex, anchorRow, anchorCol)`:
   - Throws if `slotIndex ∉ [0, TRAY_SIZE)` or if that slot is already empty.
   - Throws if `applyPlacement` would throw (illegal placement).
   - On success: updates `game.boardState` via `applyPlacement`, sets `game.trayPieces[slotIndex]` to `null`, and re-renders both board and tray DOM.
8. After a successful `place`, the corresponding `.tray__slot` in the DOM has no `data-piece-id` and no piece cells.
9. After all three slots have been placed and a fourth `place` runs (or is checked for refill timing — implementation choice), the tray refills with three fresh sampled pieces. The acceptable contract: **immediately after the third successful `place`, `trayPieces` is back to three fresh pieces** (refill happens at the moment the tray becomes empty, before the controller returns).
10. The board DOM matches `boardState` after every `place` (covered by spot-checking a `[data-row][data-col][data-state="filled"]` selector).

## Out of scope

- Pointer Events / drag (iteration 8).
- Live placement preview (iteration 8 or 9).
- Row/column clears (iteration 9).
- Score, combo, game-over (later).
- Persistence (later).

## Test plan

New `tests/game.test.ts`:

- **Construction (with seeded rng):**
  - `boardState` is empty.
  - `trayPieces.length === TRAY_SIZE` and each entry is in `CATALOG`.
  - Two `createGame` calls with the same seeded rng produce identical tray ids.
- **`mount`:** appends board then tray under the provided root; both elements are present in the right order.
- **`place` happy path:**
  - With a controlled rng forcing a known tray, place piece 0 at (0, 0). Assert: the piece's cells are now filled in `boardState`; the matching DOM cells have `data-state="filled"` with the right `--piece-color`; the slot DOM is cleared; `trayPieces[0]` is `null`.
- **`place` slot-empty rejection:** placing on a slot that has already been placed throws.
- **`place` out-of-bounds rejection:** placing a piece whose cells extend past the board throws.
- **Refill:** with a deterministic rng, place all three pieces (at legal locations). Assert: `trayPieces` is now three fresh `Piece` values, none null, all in `CATALOG`.
- **No accidental mutation of returned `boardState`:** snapshot before `place`; after `place`, the pre-snapshot is still valid (the controller returned an independent new board, not a mutated reference).

A small deterministic-rng helper (mulberry32) is duplicated locally in the test file for now, mirroring `tests/sample-piece.test.ts`. Future extraction is on the deferred-DRY list.

## What landed

- `src/game.ts` — closure factory `createGame({ rng? })` returning `GameApi` with `mount`, `place`, `boardState`, `trayPieces`. Owns the engine state and a `Piece | null` tray of length `TRAY_SIZE`. Construction is synchronous: refill + first render run before the function returns.
- `src/tray.ts` — moved `TRAY_SIZE` here (the tray is the source of truth for slot count); `createTray` now consumes it. Removes the hard-coded `3` flagged by the verifier.
- `src/game.ts` re-exports `TRAY_SIZE` so tests and downstream callers can import either path.
- `src/main.ts` — replaced the ad-hoc sample-and-render loop with `createGame().mount(app)`. The page is now driven by the controller.
- `tests/game.test.ts` — 13 tests: construction, determinism, `mount` order + slot mirroring, happy-path placement (board state, slot DOM, board DOM, tray nulling), three rejection cases, and full-tray refill via `findSafeAnchor`.

## Verifier findings (acted on)

- Hard-coded `3` in `tray.ts` → hoisted to a `TRAY_SIZE` constant in `tray.ts`; `game.ts` imports and re-exports it.
- `trayPieces` getter returned the internal array by reference (footgun for the iteration-8 drag layer) → switched to `tray.slice()` for a defensive copy each call.
- Mulberry32 duplication: deferred to a future DRY extraction; verifier accepted.

## Final state

- Vitest: 116 passed / 0 failed (9 files).
- Typecheck: green.
- Playwright: not run.

## Next — iteration 8

Begin the Pointer Events drag layer. Smallest meaningful slice: a `Drag` controller that, given the board and tray DOM, lets the user **tap a tray piece to pick it up**, follows the pointer with a ghost via `transform: translate3d`, computes the snapped anchor with `document.elementsFromPoint`, shows a preview using cell `data-state="preview-ok"` / `"preview-bad"`, and calls `game.place(...)` on a legal drop. Multiple sub-iterations possible depending on appetite (e.g. split preview from drop).
