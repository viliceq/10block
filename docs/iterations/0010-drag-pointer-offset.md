# Iteration 10 — Drag pointer offset

**Date:** 2026-05-13.
**Status:** Complete.

## Goal

Fix a UX bug surfaced during mouse play. Today the ghost piece's top-left bbox corner anchors to the pointer's exact pixel, so the piece visually extends down-and-right from the cursor; the player has to position the pointer's *corner pixel* over the cell they want the top-left bbox cell to land on. Centring the pointer on the top-left bbox cell makes drop targeting feel natural — what the cursor sits over is what the piece's top-left lands on.

Touch-specific "offset above the touch point" (SPEC §7 iPad nicety) remains deferred — this slice fixes mouse alignment; touch lift comes later.

## Acceptance criteria

1. The drag controller reads the current `--cell-size` token value at pointerdown via `getComputedStyle(document.documentElement).getPropertyValue('--cell-size')`, with a fallback to `64` (the iPad default per SPEC §8.3) when the value is missing or unparseable (the jsdom case).
2. The cached offset (= `cellSize / 2`) is stored on the `ActiveDrag` state for the duration of one drag.
3. The ghost's `transform` becomes `translate3d((clientX - offset)px, (clientY - offset)px, 0)` for both the initial pointerdown placement and every pointermove update.
4. Hit-testing for the drop anchor and live preview both still use the *un-offset* pointer position (`document.elementsFromPoint(clientX, clientY)`). The detected board cell is therefore the same cell the player sees the top-left bbox cell centred on.
5. The cell-size read happens at most once per drag (not once per pointermove).

## Out of scope (deferred)

- Touch-specific extra Y-offset above the finger (SPEC §7).
- iPhone responsive layout (the eventual `--cell-size: 36px` media query will be picked up automatically by `getComputedStyle`).
- Animating the pickup so the piece "slides" from tray position to its first pointer position.

## Test plan

- **Update existing "follows the pointer" test:** new expected transform is `translate3d(88px, 48px, 0)` (`120 - 32`, `80 - 32`) — jsdom returns `""` for the custom property so the 64 fallback is used → offset = 32.
- **New "centres the pointer on the top-left bbox cell" test:** `clientX = clientY = 100` → expected `translate3d(68px, 68px, 0)`.
- **New "uses the un-offset pointer position for hit-testing" test:** spy on `document.elementsFromPoint`; dispatch a `pointermove` at `(150, 120)`; assert the spy was called with `(150, 120)`, not the offset coords. (Confirms AC4.)
- **Existing "ignores pointermove with a different pointerId":** the assertion `.not.toContain('999')` still holds — offset arithmetic produces `967`, not `999`.
- All other drag, preview, and game tests are unaffected.

## What landed

- `src/drag.ts` — added `readCellSize()` and `CELL_SIZE_FALLBACK = 64` (exported). `ActiveDrag` gains `pointerOffset` captured once at pointerdown. `positionGhost(ghost, x, y, offset)` now writes `translate3d(x - offset, y - offset, 0)`. Hit-testing paths (`updatePreview`, `findBoardCell` from `onPointerUp`) still receive un-offset coords.
- `tests/drag.test.ts` — updated "follows the pointer" expected transform; added two new tests: explicit centring at (100,100) and an `elementsFromPoint`-spy assertion that hit-testing uses un-offset coords.
- `tests/tokens.test.ts` — added a drift-prevention test asserting `CELL_SIZE_FALLBACK` (TS) equals the `--cell-size: 64px` declared in `tokens.css`. Future changes to either side will fail the test.

## Verifier findings (acted on)

- The TS constant `CELL_SIZE_FALLBACK` duplicates the token value, so the only convention concern was silent drift → addressed by exporting the constant and adding the drift-prevention test in `tokens.test.ts`.
- Other observations (edge case of pointer at (0,0); iPhone media query still missing per SPEC §8.3) deferred — both are flagged in the deferred list below.

## Final state

- Vitest: 140 passed / 0 failed (10 files).
- Typecheck: green.
- Playwright: not run.

## Deferred follow-ups

1. Touch-specific Y-lift above the finger on `pointerType === 'touch'` events (SPEC §7 iPad nicety).
2. iPhone responsive media query in `tokens.css` (`--cell-size: 36px` for narrow portrait viewports — SPEC §8.3). With drag now token-aware, this lights up iPhone for free.
3. The pointer-at-(0,0) edge case (ghost partially off-screen) is benign in practice; flagged only.

## Next — iteration 11

Resume the engine track: `resolveClears(board): { board: BoardState; rowsCleared: ReadonlyArray<number>; colsCleared: ReadonlyArray<number> }` — pure function that identifies all fully filled rows and columns and removes them in a single pass. After this, iteration 12 hooks it into `game.place`; iteration 13 adds scoring.
