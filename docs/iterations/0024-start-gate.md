# Iteration 24 — "Tap to play" audio-unlock gate

**Date:** 2026-05-16.
**Status:** Complete.

## Symptom / signal

iOS PWA: silent on load; sound starts only after tapping the **Mute then Unmute** `<button>`.

## Diagnosis (now definitive)

A real `<button>` **`click`** unlocks Web Audio; the drag's `pointerdown` / `touchend` does **not**. WebKit (especially standalone PWA) only honours `AudioContext.resume()` inside a *click*-class user activation. A drag (pointerdown → move → pointerup, with `touch-action: none` + pointer capture) never synthesises a `click`, so iterations 22–23 — correct in every other respect — never got a qualifying gesture. The Mute button is the first real `click` in the session, which is why it "fixes" it.

The audio code (`ensureUnlocked`: resume-then-prime, retry per gesture) is correct and unchanged. It just needs to be driven by a click. The fix is to **guarantee a click before gameplay** via a one-time start gate — the universal iOS-web-audio pattern.

## Plan

- New `src/start-gate.ts`: `createStartGate(onStart): HTMLElement` — a full-viewport `<div class="start-gate" data-visible="true">` containing a real `<button class="start-gate__button">Tap to play</button>`. The button's `click` calls `onStart()` once, then sets `data-visible="false"`.
- `src/main.ts` mounts the gate above everything and passes `() => audio.unlock()` as `onStart`. The gate intercepts all input until dismissed, so the first interaction in the session is necessarily a real button `click` → `audio.unlock()` → resume + prime succeed.
- `src/styles/start-gate.css`: fixed, full-viewport, centred, dark backdrop, button styled like the overlay button; `display: none` when `data-visible="false"`; z-index `var(--z-start-gate)`.
- New token `--z-start-gate` (above `--z-ghost`/`--z-overlay`).

`AudioApi`, `game.ts`, `drag.ts`, `audio.ts` are unchanged.

## Acceptance criteria

1. `src/start-gate.ts` exports `createStartGate(onStart: () => void): HTMLElement`.
2. The returned element has class `start-gate`, `data-visible="true"`, and contains a `<button class="start-gate__button">` with text `Tap to play` and an `aria-label`.
3. Clicking the button calls `onStart` exactly once and sets the gate's `data-visible="false"`. Subsequent clicks do nothing (and the gate is `display:none` anyway).
4. `src/main.ts` creates the gate with `onStart = () => audio.unlock()`, appends it to `#app` after everything else (so it stacks on top), and the gate is present and visible on load.
5. `src/styles/start-gate.css`: `.start-gate[data-visible="false"]` → `display: none`; `.start-gate` uses `position: fixed; inset: 0; z-index: var(--z-start-gate)`; tokens only.
6. `src/styles/tokens.css` declares `--z-start-gate` with a value greater than `--z-ghost`.
7. The gate's button is keyboard-activatable (it's a real `<button>`, so Enter/Space work for free) for desktop/accessibility.

## Out of scope

- Remembering "already played" to skip the gate on subsequent loads — the gesture requirement is per-page-load, so the gate must appear every load. (A nicety like fading it faster on repeat visits is deferrable.)
- Ring/silent-switch handling (only revisit if the gate doesn't fix it).

## Test plan

`tests/start-gate.test.ts` (new):
- `createStartGate(noop)` → `.start-gate`, `data-visible="true"`, button text "Tap to play", has `aria-label`.
- Clicking the button calls `onStart` once and flips `data-visible` to `"false"`.
- A second click does not call `onStart` again.

`tests/page-mount.test.ts` (extend):
- After mount, `#app` contains a `.start-gate` with `data-visible="true"`.
- Dispatching a `click` on `.start-gate__button` flips it to `data-visible="false"` (proves the wiring runs; `audio.unlock()` itself is unit-tested in audio.test.ts).

`tests/tokens.test.ts` (extend):
- `--z-start-gate` is declared and numerically greater than `--z-ghost`.

`CONTEXT.md` — add a **Start gate** entry.

## Files changed

- `src/start-gate.ts` (new)
- `src/styles/start-gate.css` (new)
- `src/styles/tokens.css`
- `src/main.ts`
- `tests/start-gate.test.ts` (new)
- `tests/page-mount.test.ts`
- `tests/tokens.test.ts`
- `CONTEXT.md`

## What landed

- `src/start-gate.ts` — `createStartGate(onStart)`: a fixed full-viewport `.start-gate[data-visible="true"]` with a real `<button class="start-gate__button">Tap to play</button>`. First click calls `onStart()` once and flips `data-visible="false"`; guarded against repeat.
- `src/styles/start-gate.css` — fixed/inset/`z-index: var(--z-start-gate)`, dark backdrop, `display:none` when hidden; tokens-only (no duplicated font-family — inherits from `body`).
- `src/styles/tokens.css` — `--z-start-gate: 1100` (> `--z-ghost: 1000`).
- `src/main.ts` — imports the stylesheet, appends `createStartGate(() => audio.unlock())` last so it stacks on top. The first interaction of the session is therefore necessarily a real button `click`, which is the activation WebKit requires for `AudioContext.resume()`.
- `CONTEXT.md` — Start gate entry added.

## Verifier deferred

Self-verification: 302/302 vitest, typecheck + build green. The gate's `<button>` click is exactly the activation the Mute button proved works, so the same `ensureUnlocked()` (resume→prime, unchanged since iteration 23) now fires from a qualifying gesture before any gameplay. Device retest still required to confirm on hardware.

## Final state

- Vitest: 302 passed / 0 failed (16 files). Typecheck + build green.
- Playwright: not run.

## CONTEXT entry to add

**Start gate** — the one-time `.start-gate` "Tap to play" overlay shown on every page load. Its real `<button>` click is the iOS/WebKit user activation that unlocks Web Audio (a drag never produces a `click`). Dismissed (`display:none`) after the first click; reappears every load because the gesture requirement is per-page-load.
