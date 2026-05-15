# Iteration 20 — Mobile touch playability

**Date:** 2026-05-15.
**Status:** Complete.

## Goal

Real-iPhone testing surfaced four blockers, all rooted in iOS Safari interpreting the drag as a text-selection / callout gesture:

1. Tray pieces too small to pick comfortably.
2. The selection **loupe** (magnifier) appears on touch-hold, obscuring the target.
3. Drops land ~2 cells low — the loupe/selection shifts the effective touch point.
4. A text selection range survives the drop; the player must tap elsewhere to clear it.

Fixes, in order of leverage:

- **Suppress selection + callout + default touch gestures** via CSS (`user-select`, `-webkit-touch-callout`, `touch-action`, `overscroll-behavior`). This alone kills #2, #3 (the loupe-induced offset), and #4.
- **Finger-lift offset for touch pointers** — the dragged piece floats above the fingertip and hit-testing happens at the floated position, so the player can see what they're targeting (SPEC §7's deferred "small offset above the touch point", now load-bearing on phones).
- **Bigger iPhone tray cells** — easier to see and grab (#1).

## Acceptance criteria

### Selection / gesture suppression (CSS)

1. `src/styles/board.css` adds a global rule on `html, body`:
   - `user-select: none; -webkit-user-select: none;`
   - `-webkit-touch-callout: none;`
   - `overscroll-behavior: none;` (no pull-to-refresh / rubber-band).
2. `.board`, `.tray`, `.ghost`, and `#app` declare `touch-action: none;` so the browser does not scroll, zoom, or text-select while a pointer is down on the play surfaces.

### Finger-lift offset (drag layer)

3. `src/drag.ts` defines `TOUCH_LIFT_PX = 64` (a behavioural constant, not a CSS token — it never appears in CSS).
4. `ActiveDrag` gains a `touchLift: number`: `TOUCH_LIFT_PX` when `pointerdown`'s `pointerType === 'touch'`, otherwise `0`.
5. `positionGhost` renders the ghost at `translate3d(x - offset, y - offset - touchLift, 0)` — for touch, the piece floats `TOUCH_LIFT_PX` above the finger.
6. Hit-testing (`updatePreview` and `finishDrag`/`onPointerUp`) resolves the board cell at `(clientX, clientY - touchLift)` — i.e. **where the piece visually is**, not where the finger is. What you see is what you place.
7. Mouse / pen pointers (`pointerType !== 'touch'`) keep iteration-10 behaviour exactly: `touchLift = 0`, centre-of-top-left-cell offset unchanged. Existing drag/preview tests must stay green.

### Bigger iPhone tray (tokens)

8. `src/styles/tokens.css` iPhone media block: `--tray-cell-size` 16 → 20, `--tray-slot-size` 84 → 112. The board-fit arithmetic is unaffected (it depends on `--cell-size` / gaps / pads, not tray tokens) so the existing 375 px fit test still passes. 20 px keeps a 5-cell piece (`5×20 + 4×2 = 108 px`) inside the ~114 px iPhone slot.

## Out of scope

- Clear-row fade (still deferred, iteration 21+).
- Haptic-on-pickup tuning.
- Landscape layout.
- A "drag handle" affordance on tray pieces (the whole slot is already the hit target; the loupe fix is the real lever for #1).

## Test plan

### `tests/drag.test.ts` (extend)

- A `pointerdown` with `pointerType: 'touch'` then `pointermove` at `(120, 200)` produces a ghost transform whose Y component is lifted by `TOUCH_LIFT_PX` (i.e. `translate3d(<x-offset>px, <200 - offset - 64>px, 0)`).
- For touch, `document.elementsFromPoint` is called with `(clientX, clientY - 64)` on drop (spy assertion).
- For touch, the live preview also resolves at the lifted Y (assert preview cells correspond to the lifted target).
- A `pointerdown` with `pointerType: 'mouse'` (or unset) keeps `elementsFromPoint(clientX, clientY)` — no lift — confirming no regression.
- Existing iteration-10 transform tests still pass (default polyfilled `pointerType` is `''`, treated as non-touch).

### `tests/board.test.ts` (extend the CSS-content describe)

- `board.css` declares `user-select: none` and `-webkit-touch-callout: none` on `html, body`.
- `board.css` declares `touch-action: none` for `.board` (and the rule text mentions `#app`).

### `tests/tokens.test.ts` (update)

- iPhone media block now asserts `--tray-cell-size: 20px` and `--tray-slot-size: 112px`.
- The 375 px fit-arithmetic test is unchanged and must still pass.

## Files changed

- `src/styles/board.css`
- `src/styles/tokens.css`
- `src/drag.ts`
- `tests/drag.test.ts`, `tests/board.test.ts`, `tests/tokens.test.ts`

## What landed

- `src/styles/board.css` — `html, body` now declares `user-select: none`, `-webkit-user-select: none`, `-webkit-touch-callout: none`, `overscroll-behavior: none`; `#app, .board, .tray, .ghost` declare `touch-action: none`. This is the primary fix — it stops iOS Safari from treating the press-hold as text selection, which was the shared root cause of the loupe (#2), the ~2-cell drop offset (#3), and the lingering selection (#4).
- `src/drag.ts` — `TOUCH_LIFT_PX = 64`; `ActiveDrag.touchLift` is `64` when `pointerdown.pointerType === 'touch'`, else `0`. `positionGhost` floats the ghost `touchLift` px above the finger; `updatePreview` and `onPointerUp` hit-test at `clientY - touchLift` so the cell under the *visible floating piece* is the one previewed/placed. Mouse/pen unchanged (`touchLift = 0`).
- `src/styles/tokens.css` — iPhone `--tray-cell-size` 16 → 20, `--tray-slot-size` 84 → 112 (#1; a 5-cell piece is `5×20 + 4×2 = 108 px`, inside the ~114 px iPhone slot).
- 7 new tests; the iteration-10 mouse-offset tests still pass (polyfilled default `pointerType` is `''` → non-touch). 295 tests total; typecheck green.

## Verifier deferred

Self-verification (Agent rate-limit). Key checks:

- Mouse path byte-identical to iteration 10: `touchLift = 0`, `findBoardCell(clientX, clientY)`, `translate3d(x-offset, y-offset-0, 0)`. Confirmed by the still-green iteration-10 tests and the new "does not lift for mouse" test.
- Touch path: ghost floats 64 px up, hit-test at `clientY - 64` — "what you see is what you place" holds because the lifted hit point coincides with the centre of the floated top-left bbox cell.
- The board-fit arithmetic test is unaffected (tray tokens aren't in its formula); the 375 px constraint still holds.
- `touch-action: none` is scoped to play surfaces + `#app`, not globally on `body`, so the page could still scroll if it ever overflowed — it doesn't on supported phones, but the escape hatch exists.

## Cannot verify without hardware

The real test is an iPhone. The fixes target the documented iOS Safari behaviours (selection callout, `touch-action`, gesture suppression) but a device pass is needed to confirm the loupe is gone and drops land true. **Retest on the phone after this deploys.**

## Next

If the device pass is clean, the remaining backlog is purely optional: clear-row fade (deferred since iteration 19), SPEC §13 open questions.
