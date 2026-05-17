# Iteration 27 — Orientation-adaptive shell + wire `computeLayout`

**Date:** 2026-05-17.
**Status:** Complete.

## Goal

Fix layout **issue #2** (landscape unusable: board overflows, tray below the fold) by wiring the pure `computeLayout` (iteration 25) into a runtime **binder** that drives a single aspect-switched grid shell (SPEC §8.1/§8.7/§8.9). Also resolves the carried `hudExtent` single-scalar risk from iteration 25.

## Design

### 1. `computeLayout` signature — resolve the `hudExtent` risk

Replace the single `hudExtent` with `hudWidth` and `hudHeight` (both measured by the binder from the real HUD). Portrait fit uses `hudHeight` (HUD stacks above the board); landscape panel width uses `hudWidth` (HUD sits in the right side panel). Everything else in `layout.ts` is unchanged. `layout.test.ts` helper passes both (60/60 keeps every existing numeric expectation identical, since no device case overflows via the HUD); one new test asserts the per-orientation axis is the one consulted.

### 2. `tokens.css` — JS-derived sizing, no width breakpoint (SPEC §8.3)

- Delete the `@media (max-width: 430px)` block (the cause of the landscape collapse).
- `--cell-gap`, `--board-pad`, `--screen-pad` become the single canonical static values (`2px / 6px / 12px`) — the binder reads these and they match `layout.test.ts` tokens.
- Add static `--min-cell: 28px` and `--tray-scale: 0.5` (binder reads them; single source of truth shared with `computeLayout`).
- `--cell-size`, `--tray-cell-size`, `--tray-slot-size`, new `--board-size` are **first-paint fallbacks** only; the binder overwrites them on `:root` before paint. `--cell-size` fallback stays `64px` to keep `CELL_SIZE_FALLBACK` (drag.ts) in sync (existing tokens test).

### 3. `src/viewport.ts` — the binder (new)

`createViewportBinder({ appEl, hudEl, root, measure?, schedule? })`:

- `measure()` (injectable for tests; default reads the DOM): viewport = `window.innerWidth/Height`; insets = a hidden `position:fixed` probe whose `padding` is `env(safe-area-inset-*)`, read back via `getComputedStyle`; tokens = `getComputedStyle(root)` for `--screen-pad/--board-pad/--cell-gap/--min-cell/--tray-scale`; `hudWidth/hudHeight` = `hudEl.getBoundingClientRect()`.
- `apply()`: builds `LayoutInput`, calls `computeLayout`, writes `--cell-size`, `--board-size`, `--tray-cell-size`, `--tray-slot-size` (px) onto `root.style`, sets `appEl.dataset.orientation` and `appEl.dataset.overflow`. Returns the `Layout`.
- Re-applies on `resize` + `orientationchange`, coalesced through `schedule` (default `requestAnimationFrame`) so a rotation re-fits within one frame (§8.9).
- `destroy()` removes listeners and the probe (test teardown).

The default DOM-measuring path (`env()` probe, layout boxes) is exercised on device / e2e, not jsdom (jsdom has no layout) — consistent with the project's CSS-content + pure-unit + device-retest norm. Unit tests inject `measure`/`schedule`.

### 4. Shell CSS (extend `board.css`)

`#app` is a grid (the in-flow children are exactly `.hud`, `.board`, `.tray`; overlay/combo are `position:fixed`, out of flow — no DOM restructure needed):

- `[data-orientation='portrait']`: `grid-template-areas: 'hud' 'board' 'tray'` (1 column) — board fills safe width.
- `[data-orientation='landscape']`: `grid-template-areas: 'board hud' 'board tray'` — board hugged left spanning both rows, HUD over tray in the right side panel.
- `.hud{grid-area:hud}`, `.board{grid-area:board}`, `.tray{grid-area:tray}`; `gap: var(--screen-pad)`; `place-content: center`; page may scroll only if `computeLayout` flagged `overflow` (§8.9 last resort).
- Landscape `.tray` becomes a single-column 3-row stack (its width then ≈ one `--tray-slot-size`, matching `computeLayout`'s panel-width model). Portrait keeps the 3-column row.
- Remove `.tray { margin-top }` — grid `gap` owns inter-region spacing now.

### 5. `main.ts`

After `game.mount`, create the binder (`appEl=app`, `hudEl=app.querySelector('.hud')`, `root=document.documentElement`), `apply()` once before `createDrag`, keep the handle for the app lifetime.

## Acceptance criteria

1. `LayoutInput` has `hudWidth` + `hudHeight` (no `hudExtent`); portrait fit consults `hudHeight`, landscape panel width consults `hudWidth`; all prior `layout.test.ts` numbers unchanged.
2. `tokens.css`: no `@media (max-width: …)`; declares static `--min-cell`, `--tray-scale`, `--cell-gap:2px`, `--board-pad:6px`, `--screen-pad:12px`; keeps fallback `--cell-size/--tray-cell-size/--tray-slot-size/--board-size`; `--cell-size` fallback still equals `CELL_SIZE_FALLBACK`.
3. `createViewportBinder` writes the four size vars + `data-orientation` + `data-overflow` from `computeLayout`'s output onto the injected root/app, deterministically for injected device metrics.
4. The binder re-applies when the injected resize source fires and `destroy()` removes all listeners/probe.
5. `board.css` makes `#app` an aspect-switched grid: portrait vertical `hud/board/tray`; landscape `board` spanning two rows with `hud` over `tray` in the right panel; `.tray` is single-column in landscape; no `.tray margin-top`.
6. `main.ts` constructs and applies the binder against the mounted HUD.
7. Full suite + typecheck green; SPEC §8.9 acceptance retest deferred to the user on iPhone + iPad in both orientations.

## Out of scope

- Any change to game/engine/drag/audio behaviour.

## What landed

- `src/layout.ts` + `tests/layout.test.ts` — `hudExtent` → `hudWidth`/`hudHeight`; portrait fit uses `hudHeight`, landscape panel width uses `hudWidth`. +2 per-axis tests; all prior numbers unchanged. 20 tests.
- `src/styles/tokens.css` + `tests/tokens.test.ts` — deleted the `@media (max-width: 430px)` block; canonical static `--cell-gap:2px / --board-pad:6px / --screen-pad:12px`; added `--min-cell:28px`, `--tray-scale:0.5`, `--board-size` fallback; `--cell-size` fallback kept `64px` (CELL_SIZE_FALLBACK sync). Media-query describe replaced with a "no breakpoint / static tokens" describe.
- `src/viewport.ts` (new) + `tests/viewport.test.ts` (new, 6 tests) — `createViewportBinder` + `createDomMeasure` (env-inset probe, token/HUD measurement, rAF-coalesced resize, NaN-safe fallbacks).
- `src/styles/board.css` + `src/styles/tray.css` + `tests/board.test.ts` — `#app` aspect-switched grid; portrait `hud/board/tray`; landscape `board` spanning two rows with `hud` over `tray`; landscape tray single-column stack; removed `.tray margin-top`. +6 grid CSS-content tests.
- `src/main.ts` — constructs the binder against the mounted HUD before `createDrag`.
- `CONTEXT.md` — added **ViewportBinder**; updated **Layout** for the signature change.

**Scope addition (deliberate, not creep):** kept `tests/e2e/orientation.spec.ts` (4 WebKit cases: iPhone/iPad × portrait/landscape) as permanent regression coverage — it directly pins issue #2 (board fully visible, square, tray reachable, board-left-of-tray in landscape). CI does not run e2e (typecheck + vitest + build only), so no CI risk; runs locally via `npm run test:e2e`.

## Patches

- **v29.2** — portrait tray collapsed to the pieces' intrinsic width after a landscape→portrait round-trip (pieces jammed together, gaps gone). Cause: the tray's width came from the `#app` grid's `min-content` column with a centred (non-stretched) item, which WebKit fails to recompute on an orientation round-trip; even fresh it gave cramped, uneven ~11–20px gaps. Fix: `#app[data-orientation='portrait'] .tray { width: var(--board-size); box-sizing: border-box }` — an explicit length from the binder, so the tray always equals the board width (SPEC §8.7) with even, generous spacing, immune to intrinsic-size recalculation. Added `tests/e2e/tray-spacing.spec.ts` (WebKit round-trip regression) + a `board.css` CSS-content assertion.

## Verifier outcome

Self-verified: 343 vitest pass / 0 fail (19 files), typecheck green, production build green, all 4 WebKit orientation e2e cases green (board within viewport on every device×orientation — the exact issue-#2 failure mode now provably fixed). SPEC §8.9 inset-clearance (no pixel under the notch) needs the real device — deferred to the user on iPhone + iPad, both orientations.

## Files

- `src/layout.ts`, `tests/layout.test.ts`
- `src/styles/tokens.css`, `tests/tokens.test.ts`
- `src/viewport.ts` (new), `tests/viewport.test.ts` (new)
- `src/styles/board.css`, `src/styles/tray.css`, `tests/board.test.ts`
- `src/main.ts`
- `CONTEXT.md` — add **ViewportBinder**; update **computeLayout**/**Layout** for the signature change.
