# Iteration 19 — Polish animations (placement, combo callout, overlay fade-in)

**Date:** 2026-05-15.
**Status:** Complete.

## Goal

Land three of the four polish animations from SPEC §8.5:

1. **Placement** — a cell going from `data-state="empty"` to `"filled"` animates `opacity` 0 → 1 plus `transform: scale(0.85 → 1)` over `--anim-duration`.
2. **Combo callout** — a fixed-position badge "COMBO ×N" pulses into view (opacity) for ~1 s when the controller fires `audio.combo()` (i.e., on `L ≥ 2` or `newStreak ≥ 2`). Always laid out, never causes layout shift.
3. **Overlay fade-in** — when `data-visible` flips from `"false"` to `"true"` on the `.overlay`, opacity transitions 0 → 1 over `--anim-duration`.

The fourth SPEC §8.5 item (**clear-row fade**) is **deferred** to a follow-up iteration because it requires inserting a 180 ms async window in `game.place()` (an intermediate `data-state="clearing"` phase before the cleared cells become empty). Doing that cleanly needs more test plumbing than this slice should carry.

All animations respect `@media (prefers-reduced-motion: reduce)` — that rule already zeroes `transition-duration` and `animation-duration` globally (iteration 1).

## Acceptance criteria

### Placement

1. `src/styles/board.css` defines a `@keyframes cellAppear` animation: `from { opacity: 0; transform: scale(0.85); }` → `to { opacity: 1; transform: scale(1); }`.
2. `.board__cell[data-state="filled"]` declares `animation: cellAppear var(--anim-duration) var(--anim-easing) both;`. The shorthand fires the animation each time the selector starts matching (i.e., each time a cell becomes filled).
3. `transform-origin: center` on `.board__cell` so the scale-in is centred.

### Combo callout

4. `src/game.ts` exports nothing new for this — the callout is internal DOM. `createGame` builds a `<div class="combo-callout" data-visible="false">` element, mounts it after the HUD inside the root, and is responsible for showing it.

5. On every `place()` that fires `audio.combo()`, the controller also sets `combo-callout.textContent = "COMBO ×<newStreak>"`, sets `data-visible="true"`, and schedules a `window.setTimeout` to set `data-visible="false"` after `--anim-duration × 5 ≈ 900 ms`. The callout text shows the *current* streak after this combo.

6. The setTimeout handle is cleared on `newGame()` and overwritten on subsequent combos so a rapid-fire combo chain doesn't lose state.

7. `src/styles/hud.css` (or a new `src/styles/combo.css`) styles `.combo-callout`:
   - Fixed position above the HUD (or near it), centred horizontally.
   - `data-visible="false"`: `opacity: 0; pointer-events: none;`.
   - `data-visible="true"`: `opacity: 1;` plus a CSS animation that pulses opacity briefly.
   - Transition: `opacity var(--anim-duration) var(--anim-easing)`.

### Overlay fade-in

8. `src/styles/overlay.css` keeps the `data-visible="false" → display: none` rule but adds an `opacity` transition on the visible state, so showing the overlay fades in over `--anim-duration`.

## Out of scope

- Clear-row fade (deferred to next iteration; needs an async stage in `game.place()`).
- Streak/score animations.
- Particle effects, confetti, etc.

## Test plan

### `tests/board.test.ts` (extend)

- The CSS file `src/styles/board.css` declares a `@keyframes cellAppear` rule (string match).
- `.board__cell[data-state='filled']` declares an `animation:` containing `cellAppear` (string match).

### `tests/game.test.ts` (extend)

- After construction, the root contains a `.combo-callout` with `data-visible="false"` and empty/initial text.
- A non-combo placement does NOT change the callout.
- A placement that fires `audio.combo()` (the existing combo-row+col fixture) sets `.combo-callout` text to `COMBO ×<n>` and `data-visible="true"`.
- `vi.useFakeTimers()` advances 900 ms → `data-visible` returns to `"false"`.
- A subsequent combo before the timeout expires updates the text and resets the timer (covered indirectly — set up by clearing the prior timeout).
- `newGame()` resets the callout to hidden.

### `tests/overlay.test.ts` or `tests/pwa.test.ts` (extend a CSS-file content check)

- `src/styles/overlay.css` declares `transition` on `opacity` for `.overlay`.

### `tests/page-mount.test.ts` (extend)

- After mount, the document contains a `.combo-callout` with `data-visible="false"`.

## Files added / changed

- `src/styles/board.css` — placement animation rules.
- `src/styles/overlay.css` — overlay fade-in transition.
- `src/styles/combo.css` (new) — combo callout styles.
- `src/game.ts` — combo callout DOM creation, timer management, `newGame` reset.
- `src/main.ts` — import the new stylesheet.
- `tests/board.test.ts`, `tests/game.test.ts`, `tests/page-mount.test.ts` — new assertions per the test plan.

## What landed

- `src/styles/board.css` — added `transform-origin: center` to the cell base rule, animation `cellAppear var(--anim-duration) var(--anim-easing) both` on the filled state, and the `@keyframes cellAppear { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }` definition. Each new filled cell pops in.
- `src/styles/overlay.css` — added `transition: opacity var(--anim-duration) var(--anim-easing)` to `.overlay` so the game-over screen fades in rather than snapping.
- `src/styles/combo.css` (new) — fixed-position centered callout with a `comboPulse` keyframe (`opacity 0→1→1→0` with a brief `scale(1.15)` overshoot). Uses tokens only.
- `src/main.ts` — imports `./styles/combo.css`.
- `src/game.ts` — introduces an internal `.combo-callout` DOM element. `showComboCallout(streak)` flips `data-visible` to `true`, sets text `COMBO ×<streak>`, and schedules a 900 ms timeout to hide it again. `hideComboCallout()` clears the timeout and the visibility flag. `newGame()` calls `hideComboCallout()` so a fresh game starts cleanly. The callout is appended last in `mount()` so it stacks above board/tray.
- `tests/board.test.ts`, `tests/overlay.test.ts`, `tests/game.test.ts`, `tests/page-mount.test.ts` — 10 new assertions: CSS keyframes + animation property on `data-state='filled'` (3), overlay opacity transition (1), combo callout mount + initial hidden state (2 across game and page-mount), combo callout text + visibility on combo, auto-hide after 900 ms via `vi.useFakeTimers`, hide on `newGame` (3).

## Verifier deferred

Same Agent rate-limit caution. Self-verification:

- CSS files contain the required keyframes / transitions per SPEC §8.5 (clear-fade aside).
- The combo-callout timer cancels on subsequent combos so rapid-fire chains don't glitch (handled by `clearTimeout` before scheduling a fresh one).
- `newGame()` resets the callout AND clears any pending timeout so the next game starts cleanly.
- `prefers-reduced-motion` already neutralises both the keyframe animations and the overlay transition (board.css contains the global `*` reduced-motion rule from iteration 1).
- 288/288 vitest; typecheck green.

## Final state

- Vitest: 288 passed / 0 failed (15 files).
- Typecheck: green.
- Playwright: not run.

## Deferred follow-ups

1. **Clear-row fade** (SPEC §8.5) — needs an intermediate `data-state="clearing"` phase in `game.place()` with an async window of `--anim-duration`. Best done after stabilising the controller's render cadence.
2. Score increment ticker animation when the score changes.
3. Subtle tray-slot fade-in when refill happens.

## Next — iteration 20

Implement the deferred clear-row fade. After that, SPEC v1 is fully realised modulo the §13 open questions and the "non-blocking" follow-ups bookmarked in earlier iterations.
