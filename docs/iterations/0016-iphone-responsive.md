# Iteration 16 — iPhone-portrait responsive sizing

**Date:** 2026-05-14.
**Status:** Complete.

## Goal

Per SPEC §8.3: on narrow (iPhone-portrait-sized) viewports the board should shrink so the whole game fits without horizontal scrolling. The drag layer is already token-aware (`readCellSize` queries `--cell-size` per drag), so this iteration is purely a CSS media query plus tests.

## Acceptance criteria

1. `src/styles/tokens.css` adds an `@media (max-width: 430px)` block. 430px is the widest current iPhone in portrait (Pro Max). Modern iPhones in landscape have width ≥ 667px, so the portrait constraint is implicit.

2. Inside the media block, the following tokens are overridden:

   | Token | iPad default | iPhone override |
   |---|---|---|
   | `--cell-size` | 64px | 32px |
   | `--cell-gap` | 4px | 2px |
   | `--board-pad` | 12px | 6px |
   | `--screen-pad` | 24px | 12px |
   | `--tray-cell-size` | 28px | 16px |
   | `--tray-slot-size` | 168px | 84px |

   Board width on iPhone: `10×32 + 9×2 + 2×6 = 350px`. With `--screen-pad: 12px` on each side of `#app`, total layout width is 374px — fits iPhone SE 2nd-gen (375px) with 1px to spare and every newer iPhone in portrait (390–430px) with breathing room. (An initial 36px attempt produced a 414px layout that overflowed on iPhone 13 / 14 / 15; the 32px target is the load-bearing change.)

3. Default (iPad) values are preserved outside the media block.

4. The existing drift test (`CELL_SIZE_FALLBACK in drag.ts matches --cell-size`) still passes — it parses the first `--cell-size:` declaration, which is the default `64px`.

5. Drag offset (`readCellSize() / 2`) automatically picks up the smaller value on narrow viewports. No code change required in `src/drag.ts`.

6. `SPEC.md` §8.3 is updated to enumerate the full set of iPhone-override tokens (currently only `--cell-size` is mentioned).

## Out of scope

- iPad landscape side-by-side board+tray layout (SPEC §8.7) — separate slice.
- A dedicated iPhone SE 1st-gen 320px breakpoint.
- Dynamic Type or per-user scaling preferences.
- Animations that depend on viewport size.

## Test plan

### `tests/tokens.test.ts` (extend)

- Asserts the media query block exists with `max-width: 430px`.
- Asserts the block contains `--cell-size: 36px`.
- Asserts the block also overrides `--cell-gap`, `--board-pad`, `--screen-pad`, `--tray-cell-size`, `--tray-slot-size`.

The tests use a single regex scoped to the media block contents (greedy match of `@media (max-width: 430px) { ... }`).

## What landed

- `src/styles/tokens.css` — appended an `@media (max-width: 430px)` block overriding the six sizing tokens.
- `tests/tokens.test.ts` — five new assertions: media block exists, `--cell-size: 32px`, gap/pad overrides, tray overrides, and a fit-arithmetic test that parses the tokens and asserts `boardWidth + 2 × screenPad ≤ 375px` (iPhone SE viewport). The arithmetic test pins the contract: any future token tweak that overflows iPhone SE fails the build.
- `SPEC.md` §8.3 — added the full iPhone-override table plus the sizing-math footnote.

## Verifier deferred

The verifier agent hit a rate limit before its report came back, so this iteration ships with self-verification only. Findings I caught:

- The initial 36px attempt produced a 414px layout (iPhone 13/14/15 are 390px wide) — overflow. Dropped to 32px so the layout is 374px, fitting iPhone SE (375px).
- Updated SPEC §8.3 from the old "to 36px" prose into a full override table.
- All 234 tests pass, typecheck green.

## Final state

- Vitest: 234 passed / 0 failed (13 files).
- Typecheck: green.
- Playwright: not run.

## Deferred follow-ups

1. iPhone SE 1st-gen (320px width) — not currently supported; would need either a second media breakpoint or smaller cells.
2. iPad landscape side-by-side board+tray layout (SPEC §8.7) — separate slice.
3. A Playwright visual-regression test at iPhone-SE and iPad viewports would catch fit regressions independently of the token math.

## Next — iteration 17

Audio + haptics per SPEC §9: short SFX on place / clear / combo / perfect clear / game over; `blockly:mute` flag persisted; haptics best-effort via `navigator.vibrate`. Pure SFX module plus a small game wiring.
