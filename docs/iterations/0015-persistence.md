# Iteration 15 — Persistence (`bestScore` + resume game)

**Date:** 2026-05-14.
**Status:** Complete.

## Goal

Persist two pieces of SPEC §10 state to `localStorage` so the player gets:

1. A **best score** that survives across reloads and new games.
2. **Resume game** — closing the tab mid-game returns the player to the same board and tray on next load.

Per SPEC §10 the snapshot is "Cleared on game over."

Audio's `mute` flag is also a SPEC §10 entry but stays deferred — it lands with the audio iteration (SPEC §9).

## Acceptance criteria

### Storage module

1. New `src/storage.ts` exports `loadBestScore()`, `saveBestScore(n)`, `loadLastGame()`, `saveLastGame(state)`, `clearLastGame()`. All operations are wrapped in try/catch so a disabled or full `localStorage` degrades silently.

2. `LastGame` shape: `{ board: BoardState, trayIds: ReadonlyArray<string | null>, score: number, streak: number }`. Pieces are persisted by id, not by reference (catalog drift is then handled at load time).

3. `loadLastGame()` returns `null` when:
   - the key is missing,
   - the JSON is unparseable,
   - the shape doesn't validate (wrong dimensions, missing fields, wrong types).

4. `loadBestScore()` returns `0` when the key is missing or the value is non-numeric/negative.

5. Storage keys are namespaced under `blockly:` (e.g. `blockly:bestScore`, `blockly:lastGame`) to avoid clashing with other apps on the same origin.

### Pieces

6. `src/pieces.ts` exports `findPieceById(id: string): Piece | undefined` — a small `CATALOG.find(...)` lookup used when rehydrating a tray from stored ids.

### Game controller

7. `GameApi.bestScore: number` — read-only getter. Initialised from `loadBestScore()` at construction.

8. After every `place`, if `score > bestScore`, the controller updates `bestScore` and calls `saveBestScore`. The new best is reflected in the next `render`.

9. `newGame()` preserves `bestScore`. The HUD shows the surviving best.

10. After every `place`, the controller persists a `LastGame` snapshot via `saveLastGame` — unless the placement triggered `gameOver`, in which case `clearLastGame` runs instead (SPEC §10 "Cleared on game over.").

11. At construction, when `options.initialBoard` is **not** provided, the controller tries `loadLastGame()`. On a valid snapshot it rehydrates `board`, `tray` (mapping ids to pieces via `findPieceById`, with unknown ids → `null`), `score`, and `streak`. On null or invalid, it starts a fresh empty game.

12. `newGame()` clears the snapshot via `clearLastGame()` so a subsequent reload starts fresh.

### HUD

13. `createHud()` returns a DOM with **two** label/score pairs:
   - `.hud__pair--current` containing `.hud__label` "SCORE" and `.hud__score` "0"
   - `.hud__pair--best` containing `.hud__label` "BEST" and `.hud__score` "0"

14. `renderScore(hudEl, score)` updates only the **current** score's text (scoped selector `.hud__pair--current .hud__score`). Existing call sites continue to work.

15. New export `renderBestScore(hudEl, bestScore)` updates the **best** score's text (scoped selector `.hud__pair--best .hud__score`).

16. `Game.render()` calls both `renderScore` and `renderBestScore` on every refresh.

### Styles

17. `src/styles/hud.css` lays out the two pairs side-by-side via CSS Grid. No new tokens required; reuses `--screen-pad`, `--cell-gap`, `--color-text`.

## Out of scope

- Audio mute flag (SPEC §9 / §10's `mute`).
- A "clear high score" UI (SPEC §13 open question — default no).
- Serialising the rng state — refills after a resume use a fresh `Math.random` stream. Acceptable per SPEC.

## Test plan

### `tests/storage.test.ts` (new)

- `loadBestScore` returns `0` when nothing is stored.
- `saveBestScore` + `loadBestScore` round-trip.
- `loadBestScore` returns `0` on a non-numeric stored value.
- `loadLastGame` returns `null` when nothing is stored.
- `saveLastGame` + `loadLastGame` round-trip on a valid state.
- `loadLastGame` returns `null` on unparseable JSON.
- `loadLastGame` returns `null` on wrong-shape JSON (e.g. board with 9 rows).
- `clearLastGame` removes the key.
- All write functions tolerate `localStorage.setItem` throwing (mock the method to throw; assertions: no propagation, no test crash).

`beforeEach` clears `localStorage` so tests are independent.

### `tests/pieces.test.ts` (extend)

- `findPieceById('single')` returns the single piece.
- `findPieceById('not-a-piece')` returns `undefined`.

### `tests/hud.test.ts` (extend)

- `createHud()` exposes a `.hud__pair--best` with label "BEST" and score "0".
- `renderBestScore(hud, 540)` updates only the best score, leaving current untouched.
- Existing `renderScore` and label tests continue to pass (first-match semantics still resolve to the current pair).

### `tests/game.test.ts` (extend)

- After construction with a fresh `localStorage`, `bestScore === 0`.
- After a placement that increases `score`, `bestScore` matches `score`.
- After a placement that lowers/equals `score` (impossible — score is monotonic — but verify `bestScore` never decreases): `newGame()` preserves `bestScore`.
- A second `createGame` after a placement reads the persisted `bestScore` (and resumes via `lastGame`).
- A second `createGame` after `gameOver` does NOT resume (snapshot cleared).
- A second `createGame` after `newGame()` does NOT resume (snapshot cleared).
- An explicit `initialBoard` skips the resume path even when a snapshot exists.

### `tests/page-mount.test.ts` (extend)

- The HUD includes a BEST pair with value "0" on first mount.

## Files added / changed

- `src/storage.ts` (new)
- `src/hud.ts`
- `src/styles/hud.css`
- `src/pieces.ts` (add `findPieceById`)
- `src/game.ts`
- `tests/storage.test.ts` (new)
- `tests/hud.test.ts`
- `tests/game.test.ts`
- `tests/pieces.test.ts`
- `tests/page-mount.test.ts`
- `CONTEXT.md` (add `bestScore`, `LastGame`, persistence terms)

## What landed

- `src/storage.ts` (new) — five exports wrapped in try/catch, the `LastGame` shape, and an `isValidLastGame` shape validator that rejects bad object shapes, wrong dimensions, AND cell values that aren't `null` or a known `PieceFamily`.
- `src/pieces.ts` — new `findPieceById(id)` helper; unknown ids return `undefined`.
- `src/hud.ts` — `createHud` now builds two `.hud__pair` children (`current` + `best`); `renderScore` and a new `renderBestScore` are scoped via `.hud__pair--current/.hud__pair--best`.
- `src/styles/hud.css` — restructured layout for the two pairs using existing tokens only.
- `src/game.ts` — integrates `bestScore` (loaded at construction, persisted on each `score` increase, preserved across `newGame`) and the `lastGame` snapshot (saved after every successful `place` unless `gameOver` is true, in which case it's cleared). Construction tries `loadLastGame()` when no `initialBoard` is provided; on a valid snapshot it rehydrates `board`, `tray` (via `findPieceById`, unknown → `null`), `score`, `streak`.
- `tests/setup.ts` — Map-backed `localStorage` polyfill for vitest's jsdom env, plus a global `beforeEach(() => localStorage.clear())` so persistence state cannot bleed between tests.
- `vitest.config.ts` — sets `environmentOptions.jsdom.url = 'http://localhost/'`. (Did not on its own fix the missing Storage methods, but is the right baseline.)
- `CONTEXT.md` — added `bestScore`, `LastGame`, `trayIds` entries.

## Verifier findings (acted on)

- CONTEXT.md was missing the new persistence vocabulary → added.
- The catalog-drift branch (`findPieceById(unknownId) ?? null`) was untested → added `tests/game.test.ts:drops unknown trayIds to null when resuming`.
- The `isValidLastGame` "poisoned cell" rejection was untested → added `tests/storage.test.ts:loadLastGame returns null when a board cell carries an unknown family`.

## Final state

- Vitest: 229 passed / 0 failed (13 files).
- Typecheck: green.
- Playwright: not run.

## Deferred follow-ups

1. Add the `mute` flag from SPEC §10 alongside audio (next iteration).
2. Persist (and surface) a player-visible "Best score reset" affordance per SPEC §13 open question.
3. Consider serialising rng state if reproducible resume becomes a requirement (currently out of scope).

## Next — iteration 16

Audio / haptics per SPEC §9: short SFX on place, clear, combo, perfect clear, and game over; mute toggle persisted via `localStorage` `blockly:mute`. Haptics best-effort via `navigator.vibrate` where supported. Pure SFX module + a small Game wiring.
