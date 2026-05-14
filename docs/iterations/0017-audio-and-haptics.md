# Iteration 17 — Audio + haptics

**Date:** 2026-05-14.
**Status:** Complete.

## Goal

Wire the seven SFX events from SPEC §9 to the game, persist a mute flag (SPEC §10 third key), surface a mute toggle in the HUD, and fire best-effort haptic feedback via `navigator.vibrate` where supported. iOS Safari requires a user gesture to start audio — the audio module unlocks itself on the first pointerdown.

## Acceptance criteria

### Audio module

1. `src/audio.ts` exports `createAudio()`, `createSilentAudio()`, and the `AudioApi` type.
2. `AudioApi` has methods: `pickup()`, `place()`, `reject()`, `clear()`, `combo()`, `perfect()`, `gameOver()`, plus `setMuted(boolean)`, `isMuted()`, and `unlock()`.
3. `createAudio()` constructs seven `HTMLAudioElement`s pointing at `/sounds/<name>.mp3` (pickup, place, reject, clear, combo, perfect, gameover).
4. Each event method, when **not** muted, rewinds the element (`currentTime = 0`) and calls `.play()`. Any rejected promise (autoplay block) is swallowed silently.
5. Each event method, when muted, is a no-op for both audio and haptics.
6. Mute state is initialised from `loadMute()` (defaults `false`). `setMuted(value)` updates the in-memory flag and calls `saveMute(value)`.
7. `unlock()` attempts a synchronous `play()` followed by `pause()` and `currentTime = 0` on every element. iOS Safari requires this inside a user gesture so the first SFX after the unlock plays cleanly.
8. `createSilentAudio()` returns an `AudioApi` whose methods are all no-ops. Used by tests so they don't need to mock audio.
9. Haptics: each event method also calls `navigator.vibrate(...)` with an appropriate pattern, when:
   - `navigator.vibrate` is a function, AND
   - `isMuted()` returns false.
   Vibration patterns:
   - pickup / reject / place: `10` ms
   - clear: `30` ms
   - combo: `[40, 30, 40]` ms
   - perfect: `[60, 40, 60, 40, 60]` ms
   - gameOver: `[80, 60, 80]` ms

### Storage

10. `src/storage.ts` adds `loadMute(): boolean` and `saveMute(value: boolean): void` under the key `blockly:mute`. Both defensive (try/catch). `loadMute` returns `false` when nothing is stored or the value is not the literal string `"true"`.

### Game wiring

11. `GameOptions.audio?: AudioApi`. Defaults to `createSilentAudio()` when omitted.
12. After every successful `place(...)`, exactly **one** of the audio methods is invoked based on this priority (highest first):
    1. `audio.gameOver()` — if `gameOver` just flipped to true
    2. `audio.perfect()` — if the post-clear board is empty
    3. `audio.combo()` — if `L >= 2` OR `newStreak >= 2`
    4. `audio.clear()` — if `L === 1`
    5. `audio.place()` — otherwise

### Drag wiring

13. `createDrag(game, trayEl, boardEl, audio?)` takes an optional fourth `audio` argument. Defaults to `createSilentAudio()`.
14. On a successful pickup (filled slot, not gameOver), drag calls `audio.pickup()`.
15. On `pointerup`/`pointercancel` where placement does **not** occur (off-board or `canPlace` false), drag calls `audio.reject()`. Pointercancel still triggers `audio.reject()` (consistent with the existing cleanup-no-place branch).

### Main wiring

16. `src/main.ts` creates a single audio instance via `createAudio()`, passes it to `createGame` and `createDrag`, and attaches a one-time pointerdown listener to `document` that calls `audio.unlock()`.

### HUD mute toggle

17. `createHud()` adds a `.hud__mute` button. Its `aria-label` is "Mute audio" / "Unmute audio" and its text reads "Mute" / "Unmute" depending on state.
18. New export `renderMute(hudEl, muted)` updates the button's label and text.
19. `Game.render()` calls `renderMute(hudEl, audio.isMuted())` each refresh.
20. Game wires the mute button's click handler at construction to call `audio.setMuted(!audio.isMuted())` then `render()`.

### Styles

21. `src/styles/hud.css` adds a `.hud__mute` rule. Positioned alongside the score pairs in the same grid. No new tokens.

## Out of scope

- Background music (SPEC §9 "Music: none in v1.").
- Per-event volume control.
- Web Audio API (using `HTMLAudioElement` keeps this minimal).
- Audio sprite sheet.

## Test plan

### `tests/audio.test.ts` (new)

- `createSilentAudio()` produces an API whose methods don't throw and don't mutate any DOM.
- `createAudio()` constructs seven audio elements with the expected `src` filenames.
- Calling `pickup()` (and each other event) invokes `.play()` on the corresponding element, when not muted. (Mock `HTMLAudioElement.prototype.play` to a spy.)
- When muted, no event method calls `.play()`.
- `setMuted(true)` persists via `saveMute`. `setMuted(false)` persists `false`.
- `isMuted()` reflects state after `setMuted`.
- Initial `isMuted()` reflects `loadMute()` (test with seeded localStorage).
- `unlock()` calls `play()` then `pause()` on each element.
- When `navigator.vibrate` is a function, each event method calls it (use `vi.spyOn` on a stub set on `navigator`).
- When `navigator.vibrate` is undefined or muted, no vibration call is made (and no throw).

### `tests/storage.test.ts` (extend)

- `loadMute()` default `false`.
- `saveMute(true)` + `loadMute()` round-trips to `true`.
- `saveMute(false)` + `loadMute()` round-trips to `false`.
- `loadMute` returns `false` for non-"true" values.

### `tests/game.test.ts` (extend)

- After a non-clearing placement, only `audio.place` is called.
- After a single-line clear (`L === 1`), only `audio.clear` is called.
- After a multi-line clear / streak ≥ 2, only `audio.combo` is called.
- After a placement that empties the board, only `audio.perfect` is called.
- After a placement that triggers game over, only `audio.gameOver` is called.

For each test, build a minimal `AudioApi` with spies for all seven methods (or use a single "recorder" helper).

### `tests/drag.test.ts` (extend)

- A successful pickup calls `audio.pickup`.
- An illegal release calls `audio.reject` (and does NOT call any other sound).
- A successful release does not call `audio.reject`. (Place sound comes from game, not drag.)
- A pickup while gameOver does NOT call `audio.pickup`.

### `tests/hud.test.ts` (extend)

- `createHud()` exposes a `.hud__mute` button with default label "Mute".
- `renderMute(hud, true)` updates the label to "Unmute".
- The button's `aria-label` reflects state.

### `tests/page-mount.test.ts` (extend)

- The mounted HUD contains a `.hud__mute` button.

## Files added / changed

- `src/audio.ts` (new)
- `src/storage.ts`
- `src/game.ts`
- `src/drag.ts`
- `src/hud.ts`
- `src/main.ts`
- `src/styles/hud.css`
- `tests/audio.test.ts` (new)
- `tests/storage.test.ts`
- `tests/game.test.ts`
- `tests/drag.test.ts`
- `tests/hud.test.ts`
- `tests/page-mount.test.ts`
- `CONTEXT.md` (add `AudioApi`, `mute`, `unlock`)

## What landed

- `src/audio.ts` (new) — `createAudio()` constructs seven `HTMLAudioElement`s, plays them on event with `currentTime = 0` rewinds, fires haptics through `navigator.vibrate` (array form to satisfy lib.dom's `Iterable<number>` signature), reads/writes mute state through `loadMute`/`saveMute`, and exposes `unlock()` for the first-gesture priming. `createSilentAudio()` returns a no-op `AudioApi` for tests.
- `src/storage.ts` — added `loadMute()` / `saveMute()` under `blockly:mute`.
- `src/hud.ts` — added `.hud__mute` button to the HUD with a new `renderMute(hudEl, muted)` text/aria toggle.
- `src/styles/hud.css` — third grid column for the mute button, end-justified.
- `src/game.ts` — accepts `options.audio?: AudioApi`, defaults to `createSilentAudio()`. After every successful `place()`, exactly one SFX fires by priority: `gameOver` → `perfect` → `combo` → `clear` → `place`. Click handler on the mute button toggles state via `audio.setMuted(...)` and re-renders.
- `src/drag.ts` — accepts an optional `audio` arg (defaults to silent). Calls `audio.pickup()` after the ghost mounts and `audio.reject()` from `finishDrag` whenever no placement happens (illegal drop, off-board, or pointercancel).
- `src/main.ts` — creates the singleton `createAudio()`, passes it to both `createGame` and `createDrag`, and wires a one-shot `pointerdown` listener that calls `audio.unlock()` and removes itself.
- `CONTEXT.md` — entries for `AudioApi`, `mute`, `unlock`.

## Tests

31 new tests across six files:

- `tests/audio.test.ts` (new) — 13 tests covering silent stub, per-event playback on a distinct element, mute gating, mute persistence, mute initialisation from storage, `unlock()` priming, and haptics with/without `navigator.vibrate`.
- `tests/storage.test.ts` — 4 mute round-trip tests.
- `tests/hud.test.ts` — mute button creation and `renderMute` label/aria toggle.
- `tests/game.test.ts` — 5 audio-priority tests (place / clear / combo / perfect / gameOver).
- `tests/drag.test.ts` — 4 audio-integration tests (pickup, reject on illegal, no reject on legal, no pickup when gameOver).
- `tests/page-mount.test.ts` — assert mute button mounted.

## Verifier deferred

Same rate-limit constraint as iteration 16. Self-verification only. Spot checks:

- The audio priority chain `gameOver > perfect > combo > clear > place` plays exactly **one** SFX per move (verified by the 5 priority tests asserting `expect(rec.calls).toEqual([...])` with a single entry each).
- The drag layer's `audio.pickup()` runs only after the ghost is successfully created (not on a no-op pointerdown).
- `audio.reject()` fires from `finishDrag` whenever `placed === false`, which covers off-board, illegal-anchor, AND pointercancel paths.
- Mute persists across game instances (stored in `localStorage` under `blockly:mute`).
- iOS Safari unlock is wired via the first-pointerdown listener in `main.ts`.

## Final state

- Vitest: 265 passed / 0 failed (14 files).
- Typecheck: green.
- Playwright: not run.

## Deferred follow-ups

1. A volume slider (per-event volume control) — would expose a `setVolume(name, vol)` on `AudioApi`.
2. Web Audio API for finer SFX control (overlap, pitch variance per replay, low-latency on iOS).
3. SFX preload progress UI for slow connections.

## Next — iteration 18

Polish slice — clear animation, combo callout, overlay fade-in. The pieces that make the game feel finished but don't change behaviour.
