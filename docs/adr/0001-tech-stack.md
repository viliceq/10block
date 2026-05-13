# ADR 0001 — Tech stack

**Status:** Accepted, 2026-05-13.

## Context

Blockly is a single-screen block-puzzle PWA targeting iPad Safari, played by a parent and a child. Project values:

- Iterative TDD with very high test coverage.
- Minimal moving parts (one developer, hobby project, no team).
- Long-term maintainability without framework churn.
- LLM-friendly code: predictable structure, one obvious way to do things.

The decision has to be made before iteration 1 because every subsequent piece of code consumes it.

## Decision

Use **Vanilla TypeScript + Vite + Vitest + Playwright**, with no UI framework and no CSS framework.

- **Vite** — dev server and production build.
- **TypeScript** — strict mode, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.
- **Vitest** — unit tests; `jsdom` environment.
- **Playwright** — end-to-end tests against Mobile-Safari emulation.
- **No UI framework** (React, Vue, Svelte).
- **No CSS framework** (Tailwind, etc.). Vanilla CSS with custom properties in `src/styles/tokens.css`.

## Alternatives considered

- **React + Vite.** Familiar component model, but a virtual DOM is unjustified for one static 100-cell grid. Bundle and complexity cost without payoff.
- **Svelte + Vite.** Reactive primitives would suit board state. Rejected: less mature Playwright tooling for niche features (custom Pointer-Events drag, PWA install).
- **Native iPadOS (Swift/SwiftUI).** Best haptics and touch feel, but requires Xcode, a developer account, and the App-Store dance. Kills iteration speed for a hobby project.
- **React Native / Expo.** Adds a native runtime layer for what is fundamentally web tech.

## Consequences

- The drag-and-drop layer must be written by hand using Pointer Events + `document.elementsFromPoint`. This is intentional (see SPEC §7) — the browser does the math.
- Test runners are split by concern: Vitest for engine logic, Playwright for input and visual flows.
- No state-management library is needed; the game state lives in one TS module.
- Any future "menu screens" will be hand-built without a router or component library.
- Future contributors must learn the conventions in `CLAUDE.md` rather than relying on framework idioms.
