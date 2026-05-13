# Iteration 3 — Tray rendering

**Date:** 2026-05-13.
**Status:** Complete.

## Goal

Render the tray below the board, with three slots, each showing one sampled piece in its family colour. First time `samplePiece` is wired into the page. Still no input — placement comes later.

Landscape side-by-side layout from SPEC §8.7 is **deferred** to a later iteration; v1 of the tray is portrait-stacked only.

## Acceptance criteria

1. `src/tray.ts` exports `createTray(): HTMLElement` returning a DOM element with class `tray`.
2. The tray contains exactly three child elements with class `tray__slot`, in order (data attribute `data-slot-index` 0, 1, 2).
3. `src/tray.ts` exports `renderPieceInSlot(slot: HTMLElement, piece: Piece): void`:
   - Clears the slot's previous content.
   - Sets `slot.dataset.pieceId = piece.id`.
   - Mounts a `.tray__piece` container inside.
   - Renders exactly `piece.cells.length` `.tray__piece-cell` elements inside the container, each placed via inline `grid-row` / `grid-column` matching the piece's cell coordinates (1-indexed for CSS Grid).
4. The `.tray__piece` element carries inline CSS custom properties `--bbox-w`, `--bbox-h`, and `--piece-color: var(--color-piece-<family>)` matching the piece.
5. `src/styles/tokens.css` declares `--tray-cell-size` (must be smaller than `--cell-size`).
6. `src/styles/tray.css` uses only tokens (no magic numbers). All visual values come from `tokens.css`.
7. `src/main.ts` mounts the tray into `#app` **after** the board, then renders three sampled pieces into the three slots using `samplePiece(Math.random)`.
8. After `main.ts` runs, every `.tray__slot` has a `data-piece-id` whose value matches some `CATALOG[*].id`.
9. Calling `renderPieceInSlot` twice on the same slot replaces the prior piece (no stale cells, `data-piece-id` updates).

## Out of scope

- Landscape side-by-side layout (deferred).
- Piece interactivity / drag (iteration 4+).
- iPhone responsive sizing.
- Refill logic (when all three placed → new sample).

## Test plan

- **Vitest unit (`tests/tray.test.ts`):**
  - `createTray()` returns `.tray` with three `.tray__slot` children, ordered, with `data-slot-index` 0/1/2.
  - `renderPieceInSlot` with a hand-crafted `single` piece: 1 cell, correct `data-piece-id`, `--piece-color` set.
  - `renderPieceInSlot` with `l2-ne` (3 cells in a 2×2 bbox): cells use the right `grid-row`/`grid-column` values; container has `--bbox-w=2`, `--bbox-h=2`.
  - Replacement behaviour: render piece A, then piece B, assert slot reflects B only.
- **Vitest token (`tests/tokens.test.ts` — extend):** asserts `--tray-cell-size` is declared.
- **Vitest integration (`tests/page-mount.test.ts` — extend):** after `main.ts` runs, `#app` contains both `.board` and `.tray`; each tray slot has a `data-piece-id` that is one of `CATALOG[*].id`.
- **Playwright:** still deferred — no input to drive yet.

## What landed

- `src/tray.ts` — exports `createTray()` and `renderPieceInSlot(slot, piece)`. The latter clears prior content, sets `data-piece-id`, mounts a `.tray__piece` container with `--bbox-w` / `--bbox-h` / `--piece-color`, and lays out cells at 1-indexed CSS-grid coordinates.
- `src/styles/tokens.css` — added `--tray-cell-size: 28px` and `--tray-slot-size: 168px`.
- `src/styles/tray.css` — vanilla CSS Grid layout consuming tokens only.
- `src/main.ts` — mounts the tray after the board and renders three `samplePiece(Math.random)` results into the slots.
- `tests/tray.test.ts` — 8 tests covering `createTray` structure and `renderPieceInSlot` behaviour (cell counts per family, `--piece-color` mapping, `--bbox-*` props, 1-indexed grid placement, re-render replacement).
- `tests/page-mount.test.ts` — restructured to 4 tests under one `beforeAll` import: board mount, tray mount, sampled-piece presence, and board-before-tray DOM order.
- `tests/tokens.test.ts` — added two tests: `--tray-cell-size` declared, and the invariant that it is smaller than `--cell-size`.

## Verifier findings (acted on)

- AC5 ordering invariant (`--tray-cell-size < --cell-size`) was only verified by inspection → added a parsing-based assertion in `tokens.test.ts`.
- DOM order (board before tray) was only enforced in code → added a `children` ordering assertion in `page-mount.test.ts`.
- No other findings.

## Final state

- Vitest: 69 passed / 0 failed (7 files).
- Typecheck: green.
- Playwright: not run.

## Deferred follow-ups (verifier suggestions, not blocking)

1. Optionally extract `3` (slot count) to a shared constant / token if it ever becomes variable; otherwise leave as a structural constant.

## Next — iteration 4

Begin input. Smallest meaningful slice: implement `canPlace(board, piece, anchorRow, anchorCol)` — a pure function that returns whether a piece would fit at a given anchor cell, given the current board state (no DOM yet, no drag, no placement). This unblocks the drag/drop layer in iteration 5.
