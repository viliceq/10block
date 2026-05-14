# Iteration 13 — Scoring (engine + controller + HUD)

**Date:** 2026-05-13.
**Status:** Complete.

## Goal

Implement scoring per SPEC §5. Three layers in one slice:

1. Pure scoring primitives in `src/engine.ts`: `lineBonus(L)` (tier table from §5.2) and `streakMultiplier(streak)` (§5.3).
2. Score + streak state in the `Game` controller. After each successful `place`, score updates per §5.5: `placementPoints + round(lineBonus(L) × streakMultiplier(streak)) + perfectClearBonus`.
3. A minimal HUD above the board that displays the current score, updated on every `render()`.

Persistence of the best score (SPEC §10) is **not** in this slice; that lands when persistence is wired in a later iteration.

## Acceptance criteria

### Engine

1. `src/engine.ts` exports `lineBonus(L: number): number` matching SPEC §5.2:

   | L | Bonus |
   |---|---|
   | 0 | 0 |
   | 1 | 10 |
   | 2 | 30 |
   | 3 | 60 |
   | 4 | 120 |
   | 5 | 200 |
   | 6 | 300 |
   | 7+ | `300 + 50 × (L − 6)` |
   | < 0 | 0 (defensive) |

2. `src/engine.ts` exports `streakMultiplier(streak: number): number` matching SPEC §5.3:
   - `streak ≤ 1` → `1.0`
   - `streak ≥ 2` → `min(1 + 0.25 × (streak − 1), 3.0)`
   - Cap at `3.0` (reached at `streak === 9`).
   - Negative `streak` → `1.0` (defensive).

### Controller

3. `GameApi` exposes two new read-only getters:
   - `score: number` (initial `0`)
   - `streak: number` (initial `0`)

4. After each successful `place`, the controller computes:
   - `placementPoints = piece.cells.length`
   - `L = rowsCleared.length + colsCleared.length`
   - `newStreak = L > 0 ? streak + 1 : 0` (compute *before* the multiplier so the first clearing move applies `×1.0`)
   - `bonus = Math.round(lineBonus(L) × streakMultiplier(newStreak))`
   - `perfectClearBonus = boardEmptyAfterResolution ? 300 : 0`
   - `score += placementPoints + bonus + perfectClearBonus`
   - `streak = newStreak`

5. Perfect-clear bonus is the unmultiplied flat `300`. The streak multiplier is **not** applied to it.

6. On illegal placement (throw), neither `score` nor `streak` changes (sequence already guarantees this — the engine call throws before the score arithmetic).

### HUD

7. New module `src/hud.ts` exports `createHud(): HTMLElement` and `renderScore(hudEl, score): void`.
   - `createHud` returns a `<div class="hud">` containing a `<span class="hud__label">SCORE</span>` and a `<span class="hud__score">0</span>`.
   - `renderScore(hudEl, score)` updates the `.hud__score` text content. Other children untouched.

8. `Game.mount(root)` now appends HUD, board, tray in that order. The HUD is the first child of the root.

9. `Game.render()` calls `renderScore(hudEl, this.score)` on every refresh. After a placement, the HUD shows the new score.

10. New stylesheet `src/styles/hud.css` consuming tokens only:
    - `.hud` centred above the board, padded by `--screen-pad`.
    - `.hud__label` small, uppercase letter-spacing.
    - `.hud__score` large, tabular numbers (`font-variant-numeric: tabular-nums`).

11. No new tokens required — typography sizes are existing values (we keep with the 16px / 40px pair declared in SPEC §8.6) declared inline in `hud.css` for now; if either grows, they get hoisted.

## Out of scope

- Best-score persistence (SPEC §10) — later.
- Combo callout ("Combo ×N" indicator near the score) — visual polish later.
- Clear / score animations — later.
- Game-over detection — iteration 14.

## Test plan

### `tests/engine.test.ts`

`lineBonus` (10 tests):
- 0 → 0
- 1 → 10
- 2 → 30
- 3 → 60
- 4 → 120
- 5 → 200
- 6 → 300
- 7 → 350
- 10 → 500
- −1 → 0

`streakMultiplier` (7 tests):
- 0 → 1.0
- 1 → 1.0
- 2 → 1.25
- 5 → 2.0
- 9 → 3.0
- 20 → 3.0 (cap)
- −5 → 1.0

### `tests/hud.test.ts` (new)

- `createHud()` returns `.hud` with `.hud__label` reading "SCORE" and `.hud__score` reading "0".
- `renderScore(hudEl, 1240)` updates `.hud__score` to `"1240"`.
- Repeated `renderScore` calls overwrite, not append.

### `tests/game.test.ts`

`score` (5 tests):
- Initial `score === 0`, `streak === 0`.
- After a single placement with no clear (using seed=1's slot 0 piece), `score` equals `piece.cells.length`, `streak === 0`.
- SPEC worked example 2 — place a `penta-h` that completes one row on a (mostly) empty board: `score` increases by `5 + 10 + 300 = 315` (perfect clear since the only filled row was the one we just completed).

  Construct via brute-force seed: two `penta-h` pieces in slots 0 and 1. After `place(0, 0, 0)` (score 5, streak 0), `place(1, 0, 5)` should make score `0 + 5 + 5 + 10 + 300 = 320` and streak `1`.
- Non-clearing placement resets streak: after the above 320-score state (streak 1), place slot 2 anywhere legal that does *not* complete a row/col → streak resets to 0; score increases only by `piece.cells.length`.
- Illegal placement does not change `score` or `streak`.

### `tests/page-mount.test.ts`

- New assertion: HUD precedes board in `#app`'s children order.
- HUD contains `.hud__score` with `"0"` after initial mount.

## Files added / changed

- `src/engine.ts` (lineBonus, streakMultiplier)
- `src/game.ts` (score, streak, scoring math, HUD wiring)
- `src/hud.ts` (new)
- `src/styles/hud.css` (new)
- `src/main.ts` (no change — game.mount handles everything)
- `tests/engine.test.ts`
- `tests/hud.test.ts` (new)
- `tests/game.test.ts`
- `tests/page-mount.test.ts`

## What landed

- `src/engine.ts` — added `lineBonus(L)` (tier table 0/10/30/60/120/200/300, then `300 + 50·(L−6)`; defensive `L ≤ 0 → 0`) and `streakMultiplier(streak)` (`1.0` up to `streak = 1`, then `1 + 0.25·(streak−1)` capped at `3.0`).
- `src/game.ts` — added `score`, `streak` getters and a named `PERFECT_CLEAR_BONUS = 300` constant. `place()` now computes the move score using the §5.5 formula: `placementPoints + round(lineBonus(L) × streakMultiplier(newStreak)) + perfectClearBonus`. Streak transitions BEFORE the multiplier so the first clearing move applies `×1.0`. Render now also calls `renderScore`.
- `src/hud.ts` — new module. `createHud()` builds a `.hud` element containing `.hud__label "SCORE"` and `.hud__score "0"`. `renderScore(hudEl, score)` updates only the score text.
- `src/styles/hud.css` — CSS Grid layout (one layout primitive end-to-end), 16/40 typography with `font-variant-numeric: tabular-nums` so digits don't jitter.
- `src/main.ts` — imports `hud.css`; otherwise unchanged (Game.mount handles HUD wiring).
- `CONTEXT.md` — added Placement points, Line bonus, Move score, Perfect-clear bonus, and Score entries.

## Verifier findings (acted on)

- `.hud` used `display: flex`; converted to `display: grid; grid-template-columns: auto auto;` to keep the SPEC §8.1 "CSS Grid only" rule clean.
- New scoring vocabulary added to `CONTEXT.md`.
- `STREAK_STEP`/`STREAK_CAP` hoisting deferred — the inline constants match the SPEC formula verbatim and pulling them up offers no semantic gain.

## Final state

- Vitest: 184 passed / 0 failed (11 files).
- Typecheck: green.
- Playwright: not run.

## Deferred follow-ups

1. Best-score persistence (SPEC §10): wire `localStorage` for `bestScore` and surface it in the HUD next to the current score.
2. Combo callout — animate "Combo ×N" near the HUD when `streak ≥ 2` (opacity pulse, no layout shift).
3. Score animations / increment ticker for satisfying scoring feedback.

## Next — iteration 14

Game over per SPEC §6. After each tray refill, check whether any of the three tray pieces can be placed anywhere on the board (use `canPlace` × every anchor × the three pieces). If none, freeze the board and surface a "Game over" overlay with the final score. A new game starts by reconstructing the controller. Persistence of best score is still deferred to a later iteration.
