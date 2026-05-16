# Iteration 23 — iOS audio: prime *after* resume resolves

**Date:** 2026-05-16.
**Status:** Complete.

## Symptom

After iteration 22, iOS PWA was still silent during play — but sound came back after tapping **Mute → Unmute**.

## Diagnosis

`AudioContext.resume()` is async; the context is not `running` on the same tick. Iteration 22's `ensureUnlocked()` did:

```
if (suspended) resume();          // async — still suspended right now
if (primed) return;
primed = true;
play empty buffer;                // plays into a SUSPENDED context → no-op
```

So the one-shot prime was spent on a suspended context and `primed` latched `true` forever — the unlock never actually completed. The Mute/Unmute anecdote fits: it only worked because, by then, `resume()` had resolved and a *later real cue* coincidentally flowed through the now-running context. Non-deterministic.

## Fix

- Prime **only when `ctx.state === 'running'`**, and chain it to `resume().then(...)` so the empty buffer flows through a *running* context.
- Latch `unlocked = true` **only after the prime actually runs** — so every subsequent gesture retries until it sticks.
- Bind the unlock to more gesture types in `main.ts` (`pointerdown`, `touchend`, `click`) and stop removing the listener after the first event — `ensureUnlocked()` is idempotent (early-returns once unlocked), so leaving the listeners is free insurance, and a real `click` (the gold-standard activation, e.g. the Mute button) also drives it.

`AudioApi` contract unchanged; only `src/audio.ts`, `src/main.ts`, and the audio tests change.

(Audio playback via `AudioBufferSourceNode.start()` does **not** require an active gesture once the context is running — only `resume()` does — so priming in the microtask after `resume()` resolves is still valid.)

## Acceptance criteria

1. `createAudio()` keeps `let unlocked = false` (renamed from `primed`).
2. `ensureUnlocked()`:
   - early-returns if `unlocked`;
   - if `ctx.state === 'suspended'` → `ctx.resume().then(primeIfRunning, () => {})`;
   - else → `primeIfRunning()` synchronously.
3. `primeIfRunning()`: no-op if `unlocked`; no-op if `ctx.state !== 'running'`; otherwise `createBuffer(1,1,22050)` → source → `connect` → `start(0)`, and set `unlocked = true`. A throw leaves `unlocked` false so the next gesture retries.
4. `fire()` still: `if (muted) return;` then `ensureUnlocked()`, then play the cue if its buffer is loaded, then vibrate. (First cue may be silent if `resume()` hasn't resolved yet; cue #2+ audible — strictly better than "all silent".)
5. `unlock()` calls `ensureUnlocked()`.
6. `src/main.ts` registers the unlock on `pointerdown`, `touchend`, and `click` on `document`; listeners are **not** removed (idempotent unlock).
7. Degraded path / `createSilentAudio()` unchanged. Muted is still a total no-op (early return before `ensureUnlocked`).

## Test plan

`tests/setup.ts` — `FakeAudioContext.resume()` already flips `state` to `'running'` and returns a resolved promise; no change needed (the `.then` chain settles via the existing microtask-flush helper).

`tests/audio.test.ts`:

- `unlock()` then **await a microtask flush** → `resume` called, `createBuffer(1,1,22050)` called, source `start` called.
- Prime happens exactly once across repeated `unlock()` + events (await flush; `createBuffer` once).
- A first `fire()` with no explicit `unlock()` primes (await flush; `createBuffer` called).
- Playback test: after buffer load, `unlock()`, await flush (consume prime), then exactly one source `start` per event.
- No cue before buffers load: `unlock()`, await flush, clear `createBufferSource`, `pickup()` → not called.
- Muted: no `createBuffer`, no `createBufferSource`.
- An event synchronously calls `resume()` on a suspended context (no flush needed for the `resume` assertion — it's invoked synchronously inside `ensureUnlocked`).

`tests/page-mount.test.ts` — unaffected (still just imports `main`); the extra listeners are harmless.

`CONTEXT.md` — `unlock` entry: prime is chained to `resume()` resolution and retries until the context is running.

## Files changed

- `src/audio.ts`
- `src/main.ts`
- `tests/audio.test.ts`
- `CONTEXT.md`

## What landed

- `src/audio.ts` — `primed` → `unlocked`. `primeIfRunning()` no-ops unless `ctx.state === 'running'`, then plays the empty buffer and latches `unlocked`. `ensureUnlocked()` does `resume().then(primeIfRunning, noop)` when suspended, else primes synchronously — so the prime always flows through a *running* context and retries on every gesture until it sticks.
- `src/main.ts` — unlock bound to `pointerdown` + `touchend` + `click`, listeners no longer removed (idempotent once unlocked; a real Mute-button `click` also drives it).
- `tests/audio.test.ts` — unlock/prime assertions now await a microtask flush (prime is post-`resume()`); the "no cue before load" test reframed to assert the synchronous invariant (no awaits) since the shared immediate-resolving stubs make prime-vs-buffer-load indistinguishable after any flush.
- `CONTEXT.md` — `unlock` entry rewritten.

## Verifier deferred

Self-verification: 296/296 vitest, typecheck + build green; `createBuffer(1,1,22050)` in the bundle. The fix is deterministic in the model (prime strictly after `resume()` resolves, retried per gesture) but the proof is an iOS device in standalone PWA mode — **needs a device retest**.

## Final state

- Vitest: 296 passed / 0 failed (15 files). Typecheck + build green.
- Playwright: not run.

## If still silent

Next and likely-final suspect: the hardware ring/silent switch (iOS routes Web Audio through a session it mutes; old `HTMLAudioElement` was "media" and ignored it). The zero-cost check: flip the side switch. If that's it, iteration 24 adds a silent looping `<audio playsinline>` to promote the audio-session category. Still not built speculatively.
