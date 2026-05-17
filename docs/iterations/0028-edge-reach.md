# Iteration 28 — Bottom-row reachability for flat pieces

**Date:** 2026-05-17.
**Status:** Complete.

## Bug

In landscape, horizontal line pieces (1×2…1×5) cannot be dropped on the **bottom row**: the piece is shifted so far above the finger that reaching the bottom row needs the finger off the bottom of the screen. Other shapes are fine.

## Root cause

`drag.ts` floats the touch ghost `TOUCH_LIFT_PX = 64` above the fingertip and hit-tests at `finger − 64`. The piece lands where it is *drawn* (above the finger), anchored by its top-left bbox cell.

Iteration 27 made the board fill the **safe height** in landscape, so the board's bottom edge is now ≈ the bottom safe-area inset (~21 px on iPhone) above the screen bottom — essentially flush. To land a piece's anchor on the bottom row, the hit-test point must reach the bottom row; that needs `fingerY ≈ boardBottom + 64`, which is ~30–40 px below the physical screen. For a piece ≥ 2 cells tall the anchor sits well above the bottom row when the piece occupies it, so the finger stays on-screen — hence "only flat pieces, only landscape."

## Fix

1. **`TOUCH_LIFT_PX` 64 → 32.** Halving the lift brings the reachable hit-test point back onto the bottom row on every supported device/orientation, and directly answers the user's complaint that the piece is "shifted too much up." Still clears the fingertip enough to see the target.
2. **Geometric edge-snap fallback in `findBoardCell`.** When `elementsFromPoint` finds no board cell, snap to the nearest cell *if the point is within the board horizontally and within one cell-pitch above/below the board vertically* (using the (0,0)/(9,9) cell rects for geometry). This catches any residual sub-cell slop at the bottom edge for all pieces. Points outside that band (e.g. a release over the side-panel tray, or no layout in jsdom) still return `null`, so release-to-cancel is preserved.

No layout/board-size change; the board is not shrunk. Behaviour for non-edge drops is unchanged (the `elementsFromPoint` primary path still wins).

## Acceptance criteria

1. `TOUCH_LIFT_PX === 32`; touch ghost lift + lifted hit-test/preview all use 32 (existing lift tests updated).
2. With no layout (`getBoundingClientRect` ⇒ 0, jsdom default), `findBoardCell` behaves exactly as before (primary path; fallback no-ops) — all existing drag tests stay green.
3. Given a synthetic board rect, a point just below the board's bottom edge but within one cell-pitch and within the board's horizontal span resolves to a **bottom-row** cell (fallback).
4. A point well past the bottom edge, or outside the board horizontally, resolves to `null` (cancel preserved).
5. Full suite + typecheck green; device retest of landscape line-on-bottom-row deferred to the user.

## Files

- `src/drag.ts`
- `tests/drag.test.ts`
