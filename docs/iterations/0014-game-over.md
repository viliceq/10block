# Iteration 14 — Game over

**Date:** 2026-05-14.
**Status:** Complete.

## Goal

Implement the SPEC §6 game-over condition end-to-end:

- A pure engine predicate `hasAnyLegalPlacement(board, pieces)` that decides whether any non-null piece in the supplied list can be placed at any anchor on the board.
- Controller state (`gameOver`) updated after every `place` and tray refill.
- An overlay UI that surfaces "GAME OVER" with the final score and a "New game" button.
- A drag-layer gate so the player can't pick up pieces after game over.
- A `newGame()` method that resets everything.

Persistence of `bestScore` (SPEC §10) is still **out of scope**. Audio/haptic cues (SPEC §9) too.

A new `GameOptions.initialBoard` option lands as part of this iteration. It makes game-over tests trivial to set up (we can hand-craft a near-locked board with engine pure functions) and aligns with the future "resume game" persistence work.

## Acceptance criteria

### Engine

1. `src/engine.ts` exports `hasAnyLegalPlacement(board: BoardState, pieces: ReadonlyArray<Piece | null>): boolean`. Returns `true` iff there exists at least one non-null piece in the list and at least one `(row, col)` in `[0, 10) × [0, 10)` where `canPlace` returns `true` for that piece.

2. `hasAnyLegalPlacement` short-circuits as soon as one legal piece+anchor is found.

3. If `pieces` is empty or contains only `null`, the function returns `false`.

### Controller

4. `GameOptions` gains `initialBoard?: BoardState`. When provided, the new game starts with that board state instead of empty. (Useful for tests and the eventual persistence/resume feature.)

5. `GameApi.gameOver: boolean` — read-only getter.

6. After every successful `place` (and after any refill that happens at the end of the third placement), the controller updates `gameOver` based on `hasAnyLegalPlacement(boardState, trayPieces)`. `gameOver = !hasAnyLegalPlacement(...)`.

7. `gameOver` is also recomputed on construction (in case `initialBoard` already has no legal placement).

8. `place(...)` throws if `gameOver === true`. The thrown error mentions "game over".

9. `GameApi.newGame(): void` — resets `boardState` to empty, `score` to 0, `streak` to 0, `gameOver` to false, samples a fresh tray, and re-renders. After `newGame`, `gameOver` returns to its post-construction state (false on an empty board).

### Drag

10. `onPointerDown` in `src/drag.ts` returns early (no ghost, no capture) when `game.gameOver === true`.

### Overlay

11. New module `src/overlay.ts` exports `createOverlay()` and `renderOverlay(overlayEl, { visible, score })`.

12. `createOverlay()` returns a `<div class="overlay" data-visible="false">` containing:
   - `.overlay__heading` text "GAME OVER"
   - `.overlay__score` text "0"
   - `.overlay__button` text "New game"

13. `renderOverlay(overlayEl, { visible, score })` toggles `data-visible` to `"true"`/`"false"` and updates `.overlay__score` text to `String(score)`. Other children untouched.

14. `Game.mount` appends overlay last (after the tray) so it stacks visually above the rest.

15. `Game` wires the "New game" button's `click` listener to `newGame()` exactly once at construction.

16. `render()` calls `renderOverlay(overlayEl, { visible: gameOver, score })` on every refresh.

### Styles

17. New stylesheet `src/styles/overlay.css`:
   - `.overlay`: absolute or fixed positioned, full-viewport backdrop, z-index `var(--z-overlay)`, centred content via CSS Grid. Hidden via `display: none` when `data-visible="false"`.
   - `.overlay__heading`, `.overlay__score`, `.overlay__button`: typography and spacing via tokens.

18. New token `--z-overlay` declared in `src/styles/tokens.css`, sitting between board and `--z-ghost` (so the ghost can briefly appear above the overlay if a drag races with game-over, though this won't happen in practice).

## Out of scope

- Best-score persistence (SPEC §10).
- Audio / haptic cues (SPEC §9).
- Overlay fade-in/out animation (a later polish iteration).

## Test plan

### `tests/engine.test.ts` — extend

- `hasAnyLegalPlacement` with empty board + any one piece → `true`.
- Empty board + `[null, null, null]` → `false`.
- Full board (every cell filled) + any piece → `false`.
- Hand-crafted near-locked board where only `single` fits + tray has only `square-3` → `false`.
- Same near-locked board + tray contains `single` → `true`. Short-circuits.

### `tests/game.test.ts` — extend

- New game with empty `initialBoard` → `gameOver` is `false`.
- New game with a fully-filled `initialBoard` → `gameOver` is `true` (constructor recomputes).
- After a legal `place` that does *not* lock the board → `gameOver` stays `false`.
- After a `place` that *does* lock the board (use a constructed `initialBoard` + a tray-piece pattern that produces a no-legal-placement state after one move) → `gameOver` becomes `true`.
- `place` throws after `gameOver` is `true`.
- `newGame()` resets `boardState`, `score`, `streak`, `gameOver`, and re-renders.

### `tests/drag.test.ts` — extend

- `pointerdown` on a tray slot when `game.gameOver === true` does not create a ghost.

### `tests/overlay.test.ts` — new

- `createOverlay()` returns `.overlay` with `data-visible="false"`, heading "GAME OVER", score "0", button "New game".
- `renderOverlay(el, { visible: true, score: 540 })` sets `data-visible="true"` and updates the score text.
- Toggling back to `visible: false` updates `data-visible` accordingly without removing other children.

### `tests/page-mount.test.ts` — extend

- Overlay is present in `#app` and initially `data-visible="false"`.

### `tests/tokens.test.ts` — extend

- `--z-overlay` declared.

## What landed

- `src/engine.ts` — added `hasAnyLegalPlacement(board, pieces)`: iterates non-null pieces × every anchor, short-circuiting on the first legal `(piece, r, c)`. Empty/all-null piece lists yield `false`.
- `src/game.ts` — `GameOptions.initialBoard?: BoardState`; new state (`gameOver`, recomputed via `updateGameOver()` at construction, after each `place`, after refill). `place` throws "game over" if locked. `newGame()` resets `board`, `score`, `streak`, `gameOver`, and tray; re-renders.
- `src/overlay.ts` (new) — `createOverlay()` and `renderOverlay(el, { visible, score })`. Heading, score text, and "New game" button. State carried by `data-visible`.
- `src/styles/overlay.css` (new) + new tokens `--z-overlay: 900` and `--color-overlay-backdrop`.
- `src/drag.ts` — `onPointerDown` short-circuits when `game.gameOver === true`.
- `CONTEXT.md` — added `gameOver`, `newGame`, `initialBoard`, `Overlay` entries.

## Verifier findings (acted on)

- CONTEXT.md was missing the four new public terms (`gameOver`, `newGame`, `initialBoard`, `Overlay`) → added.
- `hud.css` and `overlay.css` redeclared the system font stack already set by `board.css`'s `html, body` → removed the duplicates and let it cascade.
- The drag-test fixture used `as never` to feed a `CellState[][]` into `initialBoard`; replaced with a `CellState[]` annotation matching the existing pattern in `tests/game.test.ts`.

## Final state

- Vitest: 202 passed / 0 failed (12 files).
- Typecheck: green.
- Playwright: not run.

## Deferred follow-ups

1. Best-score persistence (SPEC §10): persist the maximum `score` seen across games to `localStorage` and surface it in the HUD/overlay.
2. Mid-drag game-over guard: if a future feature ever flips `gameOver` while a drag is in flight, the ghost would float over the overlay (because `--z-ghost` > `--z-overlay`). The current drag gate prevents this in practice, but a small `destroy`/abort hook on the drag controller would harden it.
3. Subtle UX: fade the board behind the overlay (or animate the overlay opacity in) instead of an instant snap.

## Next — iteration 15

The v1 core loop is complete. Natural next steps:

- **Best-score persistence** (SPEC §10) — `localStorage` for `bestScore`; HUD displays it alongside the current score; new-game preserves it.
- **Resume game persistence** (SPEC §10) — snapshot `boardState`, `tray`, `score`, `streak` to `localStorage` on every render; rehydrate on construction via the existing `initialBoard` hook.
- **Audio cues** (SPEC §9) — short SFX on place / clear / combo / perfect clear / game over. Mute toggle.
