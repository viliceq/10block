# Iteration 1 — Render empty 10×10 board

**Date:** 2026-05-13.
**Status:** Complete.

## Goal

The smallest visible thing: render an empty 10×10 board in the DOM, with 100 empty cells, styled with the Modern Dark palette. No pieces, no tray, no scoring, no input yet.

## Acceptance criteria

1. The page mounts a single `.board` element inside `#app`.
2. The board contains exactly **100** `.board__cell` elements.
3. Every cell has `data-state="empty"`.
4. Every cell has `data-row` (0–9) and `data-col` (0–9) attributes set correctly.
5. The board renders as a 10×10 CSS Grid using the `--cell-size` and `--cell-gap` tokens.
6. Visual tokens live in `src/styles/tokens.css` and are imported by the entry point.
7. The Modern Dark palette is applied: page background `#0F172A`, board `#1E293B`, empty cells `#334155`.
8. A pure function — call it `createBoard()` or similar — returns the board's DOM element so tests can assert on it without spinning up the full page.

## Out of scope

- Pieces; tray; HUD; score; input; clearing logic.
- iPhone-specific media query (will be added when we hit it).
- PWA service worker / install (later iteration).

## Test plan

- **Vitest unit:** mount the board DOM in jsdom; assert structure, count, and cell attributes.
- **Vitest CSS spot-check:** verify `tokens.css` exports the expected custom properties via a string assertion on the file contents (cheap stability check; does not depend on the rendering engine).
- **Playwright e2e:** deferred — board has nothing to interact with yet. Will land in iteration 2 when a piece can be dragged.

## What landed

- `src/board.ts` — exports `createBoard()` and `BOARD_SIZE = 10`.
- `src/styles/tokens.css` — Modern Dark palette + layout/motion/preview tokens.
- `src/styles/board.css` — body centring, board grid layout, reduced-motion respect.
- `src/main.ts` — entry: imports tokens + board styles, mounts `createBoard()` into `#app`.
- `tests/board.test.ts` — 6 tests covering AC1–4 (board class, 100 cells, data-state, data-row/col on corners + centre, row-major ordering).
- `tests/tokens.test.ts` — 8 tests asserting the palette and layout tokens are declared with the SPEC values.
- `tests/page-mount.test.ts` — 1 integration test verifying `main.ts` mounts the board into `#app`.

## Verifier findings (acted on)

- **Magic-number fix:** `#app { padding: 24px }` was a magic number outside `tokens.css`. Resolved by adding `--screen-pad: 24px` to tokens and consuming it via `var(--screen-pad)`.
- **Integration test gap:** AC1/AC6 were inferred but not tested. Added `tests/page-mount.test.ts`.
- All other criteria verified by tests or code inspection; no `any`, no animated layout, no Canvas/SVG, BEM-lite class naming honoured.

## Final state

- Vitest: 18 passed / 0 failed (4 files).
- Typecheck: green.
- Playwright: not run (no e2e yet).

## Next — iteration 2

Per verifier suggestion: define the piece catalogue (19 polyominoes; six family colour tokens already in place) as data, plus a pure `samplePiece(rng)` and render the three-slot tray below the board. Unblocks the first interactive e2e test.
