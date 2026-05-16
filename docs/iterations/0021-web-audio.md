# Iteration 21 — Low-latency SFX via the Web Audio API

**Date:** 2026-05-16.
**Status:** Complete.

## Goal

Eliminate the audible delay between a pickup/drop and its SFX. Root cause: `HTMLAudioElement.play()` is media-playback API, not a low-latency trigger — on iOS Safari each call costs 100–300 ms (seek after `currentTime = 0`, async play promise, no self-overlap).

Replace the `HTMLAudioElement` implementation of `createAudio()` with the **Web Audio API**: decode each MP3 into an `AudioBuffer` once at construction, then fire a fresh `AudioBufferSourceNode` per event (sub-millisecond, overlaps cleanly).

The `AudioApi` contract is unchanged, so `game.ts`, `drag.ts`, `main.ts`, and the game/drag audio tests are untouched. Only `src/audio.ts`, `tests/audio.test.ts`, and the test polyfills change.

## Acceptance criteria

1. `createAudio()` creates a single `AudioContext` (with a `webkitAudioContext` fallback for old Safari; if neither exists it degrades to a haptics-only API that never throws).
2. At construction it fetches all seven `/sounds/<name>.mp3`, `decodeAudioData`s them, and stores the resulting `AudioBuffer`s. A fetch/decode failure for a clip leaves that event silent (no throw, no unhandled rejection).
3. Each event method, when **not muted**, creates a fresh `AudioBufferSourceNode`, connects it to `ctx.destination`, and `start()`s it — *if* that clip's buffer has finished loading. If the buffer isn't ready yet the call is a no-op for sound (still vibrates).
4. Each event method, before playing, resumes the context if it is `suspended` (iOS unlocks audio only inside a user gesture; this makes the very first event self-heal even if it precedes `unlock()`).
5. `unlock()` resumes the context if suspended. No buffer is played by `unlock()`.
6. Muted: no source is created and no vibration fires.
7. Haptics behaviour unchanged: `navigator.vibrate(pattern)` per event when not muted, array-wrapped, tolerant of a missing `navigator.vibrate`.
8. Mute state still initialises from `loadMute()` and persists via `saveMute()` on `setMuted`.
9. `createSilentAudio()` is unchanged (pure no-op API).

## Out of scope

- Per-event volume / gain nodes (could add a master `GainNode` later).
- Pitch variance per replay.
- Decoding progress UI.
- Clear-row fade (still deferred).

## Test plan

`tests/setup.ts` gains two polyfills (jsdom has neither):

- A minimal `AudioContext` (`state`, `resume()`, `decodeAudioData()`, `createBufferSource()`, `destination`, `close()`).
- A `fetch` stub that resolves `/sounds/*` to a tiny `ArrayBuffer` and rejects anything else (nothing else fetches in tests).

`tests/audio.test.ts` rewritten around the Web Audio surface:

- `createSilentAudio()` — methods don't throw; no vibration; mute toggles.
- `createAudio()` playback — after a microtask flush so buffers load, every event method creates + starts a buffer source when not muted (spy on `AudioContext.prototype.createBufferSource` / the source's `start`).
- Muted — no source created.
- Mute persistence + init from storage (synchronous, unchanged).
- `unlock()` resumes a suspended context (spy on `resume`).
- An event on a suspended context resumes it (AC4).
- Haptics — vibrate pattern per event; tolerant of missing `navigator.vibrate`; silent when muted. These don't depend on buffers (vibration fires regardless of load state) so they stay synchronous.

`tests/page-mount.test.ts` indirectly exercises `createAudio()` via `import('../src/main')`; the polyfills keep it from throwing. No assertion changes needed there.

`CONTEXT.md` — update the `AudioApi` entry: "plays MP3s via the Web Audio API" instead of "via HTMLAudioElement".

## Files changed

- `src/audio.ts` (rewrite of `createAudio`; `createSilentAudio` untouched)
- `tests/setup.ts` (AudioContext + fetch polyfills)
- `tests/audio.test.ts` (rewrite)
- `CONTEXT.md` (one-line correction)

## What landed

- `src/audio.ts` — `createAudio()` now: resolves an `AudioContext` (with `webkitAudioContext` fallback; haptics-only degrade if neither exists), `fetch`+`decodeAudioData`s the seven clips into a `Map<EventKey, AudioBuffer>` at construction, and on each event creates a fresh `AudioBufferSourceNode → ctx.destination → start()`. `resumeIfSuspended()` runs on every event *and* on `unlock()` so the first cue self-heals if it precedes the gesture unlock. A `build()` helper assembles the `AudioApi` object for both the real and degraded paths. `createSilentAudio()` and the vibrate/HAPTICS code are unchanged.
- `tests/setup.ts` — added a minimal `FakeAudioContext` / `FakeAudioBufferSourceNode` and a `/sounds/*`-scoped `fetch` stub so `createAudio()` runs in jsdom (directly in audio.test.ts, indirectly via page-mount → main.ts).
- `tests/audio.test.ts` — rewritten around the Web Audio surface: a `flushBufferLoad()` helper settles the load pipeline; tests assert source `start()` per event, no-play-before-load, mute (sound + vibration + persistence + init), `resume()` on unlock and on a stray event, and the haptics matrix.
- `CONTEXT.md` — `AudioApi` entry now says "Web Audio API … AudioBufferSourceNode".

## Verifier deferred

Self-verification (Agent rate-limit). Checks:

- `AudioApi` contract byte-identical → `game.ts`, `drag.ts`, `main.ts`, and the game/drag audio tests untouched and still green (294 total).
- Build bundles the Web Audio path; `dist/sw.js` + manifest still emitted; precache 21 entries.
- jsdom path can't throw: `AudioContext` polyfilled, `fetch('/sounds/...')` stubbed; failures are `.catch`-ed so a missing clip is silent, not fatal.
- Latency itself is only observable on a real device — **needs a device retest** to confirm the delay is gone.

## Final state

- Vitest: 294 passed / 0 failed (15 files).
- Typecheck: green. Build: green (Web Audio in bundle).
- Playwright: not run.

## Cannot verify without hardware

The whole point — perceived latency — is a device property. The implementation follows the standard low-latency pattern (decode-once buffers, per-shot source nodes, gesture-resumed context). Confirm on the iPhone after deploy.
