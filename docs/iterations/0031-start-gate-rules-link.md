# Iteration 31 — "Rules" link on the start gate

**Date:** 2026-05-17.
**Status:** Complete.

## Verifier outcome

397 vitest + typecheck green; WebKit e2e confirmed the link is visible on the gate, has `href=/rules.html target=_blank`, opens the rules page in a new tab, and the gate stays `data-visible=true` (audio-unlock/start flow untouched). `rules.html` footer bumped to v31.

## Goal

Make the deployed rules page discoverable: add a "Rules" link to the start gate, below the "Tap to play" button.

## Constraints

- Must **not** interfere with the iOS audio-unlock gesture: the gate's `onStart` (audio unlock + dismiss) is wired to the **button's** click only. The link is a separate `<a>`; tapping it neither unlocks audio nor dismisses the gate.
- Opens `/rules.html` in a new tab/window (`target="_blank"`, `rel="noopener"`) so the game page — and its service-worker/audio state — is preserved. `/rules.html` works in dev and prod (prod 308-redirects to `/rules`).

## Acceptance criteria

1. `createStartGate` adds an `<a class="start-gate__rules">` with text `Rules`, `href="/rules.html"`, `target="_blank"`, `rel` containing `noopener`.
2. Activating the link does **not** call `onStart` and does **not** change `data-visible` (stays `true`).
3. The button behaviour (onStart once, hide on click, no double-fire) is unchanged.
4. Styled as a subtle secondary link beneath the primary button (not competing with it).
5. Full suite + typecheck green. `APP_VERSION` → `v31`.

## Files

- `src/start-gate.ts`, `src/styles/start-gate.css`
- `tests/start-gate.test.ts`, `src/version.ts`
