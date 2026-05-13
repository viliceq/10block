# Iteration 12 — Wire `resolveClears` into `game.place`

**Date:** 2026-05-13.
**Status:** Complete.

## Goal

Hook the engine's `resolveClears` into the controller. After every successful `applyPlacement`, the controller resolves full rows and columns and uses that cleared board as the new state. From the player's perspective this is the first time placed pieces actually disappear when a row/column completes.

No scoring yet (iteration 13) and no clear animation (later) — just the immediate replacement of the board state.

## Acceptance criteria

1. `game.place(slotIndex, anchorRow, anchorCol)` now executes this sequence on a legal placement:
   1. `applyPlacement(board, piece, anchorRow, anchorCol)` → placed board.
   2. `resolveClears(placedBoard)` → cleared board + row/col indices.
   3. `boardState` becomes the cleared board.
   4. Slot is nulled.
   5. Tray refills if all slots are empty.
   6. `render()` reflects the post-clear state.

2. `game.boardState` after `place` equals `resolveClears(applyPlacement(prev, piece, r, c)).board`.

3. When a placement does not complete any row or column, `boardState` equals `applyPlacement(prev, piece, r, c)` (the resolveClears no-op path).

4. Illegal placement still throws; on throw, neither `applyPlacement` nor `resolveClears` produces a side-effect on the controller's state (board, tray, DOM).

5. The board DOM after a clear correctly shows the cleared cells as `data-state="empty"` with no `--piece-color` inline style.

## Out of scope

- Scoring (iteration 13).
- Clearing animation (later).
- Game-over check after refill (iteration 14).
- Persistence / "resume game" hook (later).

## Test plan

Extend `tests/game.test.ts` with a new `describe('place() — clears', ...)` block.

Strategy: brute-force a deterministic seed where the first two sampled pieces are both `penta-h` (5-cell horizontal lines). Probability per seed is ~1/361, so searching ≤ 5000 seeds easily finds one. The helper does the seed search by replaying `samplePiece(mulberry32(seed))` directly, avoiding the overhead of constructing a full `Game` for every candidate seed.

- **single row clear:** seed where slots 0 and 1 are `penta-h`; `game.place(0, 0, 0)` then `game.place(1, 0, 5)` fills row 0. Assert every cell in row 0 is `null` after the second place; assert at least one DOM cell at row 0 has `data-state="empty"`.
- **no-op clear:** with a deterministic seed, place a single piece on an empty board; assert the board contains the piece's family cells exactly (no spurious clearing).
- **slot nulled + refill still works:** after a placement that *also* triggers a clear, the slot is still nulled correctly and refill is still gated on "all three placed" — refill must not fire after a clear unless the tray is actually empty.
- **illegal placement still throws and does not mutate:** snapshot `boardState`; expect `place(..., illegal)` to throw; afterwards `boardState` is identical.

A new local helper `findSeedWithPieces(predicate)` lives in the test file for now; if iteration 13's scoring tests need the same plumbing, the helper graduates to a shared module.

## What landed

- `src/game.ts` — `place()` now chains `applyPlacement` → `resolveClears`, assigning the cleared board to the controller's `board` before nulling the slot, optionally refilling, and rendering. The slot/refill/render order is unchanged from iteration 7.
- `tests/game.test.ts` — added `findSeedWithPieces(predicate)` helper (brute-forces a seed by replaying `samplePiece` rather than building full `Game` instances), a `place() — clears` describe block with three tests, and a tightened `place() — illegal placements preserve state` test asserting board + tray + DOM all stay put on throw.

## Verifier findings (acted on)

- AC4 coverage gap: the throw test was strengthened to assert no mutation to board, tray, or DOM after an illegal placement.
- "Always-fresh board reference" sharp edge (consumer caching `game.boardState` across `place` calls would see stale data) — flagged for iteration 14+; documenting on the getter or freezing the board is a one-line follow-up.
- `findSeedWithPieces` consolidation deferred until iteration 13.

## Final state

- Vitest: 153 passed / 0 failed (10 files).
- Typecheck: green.
- Playwright: not run.

## Deferred follow-ups

1. Add a JSDoc on `GameApi.boardState` warning consumers not to cache across `place` calls (or deep-freeze `BoardState` arrays at construction time).
2. Promote `findSeedWithPieces` and `mulberry32` to a shared `tests/helpers/` module ahead of iteration 13.
3. Clear animation: fade cleared cells via `opacity` transition (reduced-motion-aware). Pure CSS + a short `data-state="clearing"` window before `data-state="empty"`.

## Next — iteration 13

Scoring per SPEC §5. The smallest meaningful slice:

- Engine exposes `lineBonus(L)` (tier lookup) and `streakMultiplier(streak)` as pure functions.
- `Game` tracks `score`, `bestScore` (in-memory only — persistence is a later iteration), and `streak`. After each `place`, score updates per §5.5.
- HUD shows the current score (no styling polish in this iteration; just a `<div class="hud">` block above the board).
- Perfect-clear bonus is detected from the cleared board (`board.every(row => row.every(cell => cell === null))`).
