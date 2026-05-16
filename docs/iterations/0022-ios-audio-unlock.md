# Iteration 22 — iOS PWA Web Audio unlock

**Date:** 2026-05-16.
**Status:** Complete.

## Symptom

After iteration 21 (Web Audio): desktop browser audio is smooth and low-latency; **iOS PWA (standalone, home-screen) plays no sound at all**.

## Diagnosis

Two iOS Web Audio facts:

1. The canonical iOS unlock requires, inside a user gesture: `ctx.resume()` **and** pushing one empty `AudioBuffer` through the context (`createBuffer(1,1,22050)` → `BufferSource` → `start(0)`). Iteration 21 only called `resume()`. Desktop tolerates that; iOS standalone does not — the output stays silent until a buffer has actually flowed from a gesture.
2. The drag's pickup handler is on `trayEl`; `main.ts`'s unlock handler is on `document`. For one pointerdown the bubble order is target → `trayEl` → … → `document`, so the first cue's `fire()` ran *before* `unlock()` — the resume was already a beat late on the very first interaction.

## Fix

Replace `resumeIfSuspended()` with `ensureUnlocked()`: resume if suspended **and**, once per session, play a 1-frame empty buffer. Call it from both `unlock()` and the first `fire()` (guarded), so the unlock happens on whichever gesture comes first — including the pickup that precedes `main.ts`'s document handler.

`AudioApi` contract unchanged → `game.ts` / `drag.ts` / `main.ts` untouched.

Secondary suspect (out of scope unless this doesn't fix it): iOS may route Web Audio through a session the hardware ring/silent switch mutes (the old `HTMLAudioElement` was "media" and ignored the switch). If priming alone doesn't restore sound, a follow-up adds a silent looping `<audio playsinline>` to flip the session category.

## Acceptance criteria

1. `createAudio()` (Web Audio path) defines `ensureUnlocked()`:
   - if `ctx.state === 'suspended'` → `ctx.resume()`
   - the first time only: `ctx.createBuffer(1, 1, 22050)` → `createBufferSource()` → `connect(destination)` → `start(0)`, wrapped in try/catch; mark unlocked so it never repeats.
2. `fire()` calls `ensureUnlocked()` before playing (so the first real cue, which rides the same gesture as pickup, unlocks the context).
3. `unlock()` calls `ensureUnlocked()` (covers a first gesture that isn't a tray pickup).
4. The empty-buffer prime happens **exactly once** per `createAudio()` instance regardless of how many events / unlock calls occur.
5. Muted still suppresses everything (no prime needed when muted — but priming is harmless; spec: `fire()` returns early when muted *before* `ensureUnlocked`, matching prior "muted = total no-op"; `unlock()` may still prime since it's an explicit gesture hook).
6. Degraded (no `AudioContext`) path and `createSilentAudio()` unchanged.

## Test plan

`tests/setup.ts` — `FakeAudioContext` gains `createBuffer(channels, length, sampleRate)` returning a minimal stub.

`tests/audio.test.ts`:

- `unlock()` resumes the context **and** creates an empty buffer + starts a source.
- The prime happens once: `unlock()` then several events → `createBuffer` called exactly once.
- A first `fire()` (no prior `unlock`) primes (createBuffer called) — covers the pickup-before-document-unlock ordering.
- Existing playback test adjusted: call `unlock()` once after buffer load to consume the one-time prime, then assert exactly one source `start` per event.
- Mute / haptics / persistence tests unchanged.

`CONTEXT.md` — `unlock` entry mentions the empty-buffer prime.

## Files changed

- `src/audio.ts`
- `tests/setup.ts`
- `tests/audio.test.ts`
- `CONTEXT.md`

## What landed

- `src/audio.ts` — `resumeIfSuspended()` → `ensureUnlocked()`: resumes a suspended context and, once per instance (`primed` flag), plays a `createBuffer(1,1,22050)` → source → `start(0)` empty buffer. Called from both `fire()` (so the pickup gesture, which precedes `main.ts`'s document handler, performs the unlock) and `unlock()`. `fire()` still returns early when muted *before* `ensureUnlocked`, preserving "muted = total no-op". Degraded path / `createSilentAudio()` unchanged. `AudioApi` contract unchanged.
- `tests/setup.ts` — `FakeAudioContext.createBuffer(channels,length,sampleRate)` stub.
- `tests/audio.test.ts` — unified `spies()` helper (resume / createBuffer / createBufferSource / start). New: unlock resumes + plays one empty buffer; prime happens exactly once across repeated unlock+events; a first `fire()` primes without an explicit unlock; muted creates no source and does not prime. Playback test now calls `unlock()` once to consume the one-time prime before the per-event assertion.
- `CONTEXT.md` — `unlock` entry rewritten for the empty-buffer prime.

## Verifier deferred

Self-verification (Agent rate-limit):

- 296/296 vitest, typecheck green, build green; `createBuffer(1,1,22050)` confirmed in the production bundle.
- Prime-once invariant covered by an explicit test (`createBuffer` called exactly once across two `unlock()`s + two events).
- Ordering fix covered: a first `fire()` with no prior `unlock()` still primes.
- The actual fix is an iOS-device property — **needs a device retest in the standalone PWA.**

## Final state

- Vitest: 296 passed / 0 failed (15 files). Typecheck + build green.
- Playwright: not run.

## If still silent after this

The remaining suspect is the hardware ring/silent switch muting Web Audio (the old `HTMLAudioElement` was "media" and ignored it). Follow-up would add a silent looping `<audio playsinline>` to flip the iOS audio-session category. Don't build it speculatively — confirm with the device first, and check the physical mute switch as the zero-cost first test.
