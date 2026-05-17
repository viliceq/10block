# 10Block — Block Puzzle Game Specification

A free, open-source 10×10 block-placement puzzle in the style of *Block Blast* / *1010!* / *Wood Block Puzzle*, built as a Progressive Web App for iPad (Safari), iPhone, and any platform with a modern browser.

*"Blockly" remains the repo / package codename for historical reasons; "10Block" is the user-facing brand.*

This document defines the game's rules, scoring, and product scope. Implementation details (framework, file layout, asset pipeline) are intentionally out of scope and will be decided when work starts.

---

## 1. Vision

A small, dependency-light web game that a parent and child can play on a shared iPad. No accounts, no ads, no network play. Open Safari, play. The game is deterministic given its random seed, runs entirely offline once loaded, and persists a single local high score.

## 2. Platform

- **Runtime:** Browser (Safari on iPadOS primary target; iPhone Safari and desktop Chrome/Safari supported as secondary).
- **Distribution:** Static site, installable as a PWA via "Add to Home Screen". Full-screen, no browser chrome when launched from the home screen.
- **Offline:** After first load, all assets are cached by a service worker; the game is fully playable offline.
- **Orientation:** Both portrait and landscape, on **both** iPhone and iPad. The single adaptive layout (§8.7, §8.9) re-fits the board to the safe space on rotation; orientation is never locked.
- **No backend.** No network calls during gameplay.

## 3. Game World

### 3.1 Board

- A **10 × 10 grid** of cells.
- Each cell is either **empty** or **filled** with a block (carrying a color from its source piece).
- The board starts empty at the beginning of each game.

### 3.2 Pieces

A **piece** is a polyomino: a connected set of unit cells with a fixed shape and color.

**Pieces cannot be rotated by the player.** Each rotation of a shape is a distinct piece in the piece catalog.

#### Core piece catalog (v1)

| # | Name | Cells | Notes |
|---|---|---|---|
| 1 | Single | 1 | 1×1 |
| 2 | Domino-H | 2 | 1×2 horizontal |
| 3 | Domino-V | 2 | 2×1 vertical |
| 4 | Tromino-H | 3 | 1×3 horizontal |
| 5 | Tromino-V | 3 | 3×1 vertical |
| 6 | Tetra-H | 4 | 1×4 horizontal |
| 7 | Tetra-V | 4 | 4×1 vertical |
| 8 | Penta-H | 5 | 1×5 horizontal |
| 9 | Penta-V | 5 | 5×1 vertical |
| 10 | Square-2 | 4 | 2×2 |
| 11 | Square-3 | 9 | 3×3 |
| 12 | L2-NE / L2-SE / L2-SW / L2-NW | 3 | 2×2 corner, four rotations |
| 13 | L3-NE / L3-SE / L3-SW / L3-NW | 5 | 3×3 corner, four rotations |

Total: **19 distinct pieces** in the core set.

Each piece carries a stable colour from one of six family slots so the player learns to recognise shapes at a glance. Hex values live in `tokens.css` (see §8.3).

| Family | Pieces | Token | Hex |
|---|---|---|---|
| Single | Single (1×1) | `--color-piece-single` | `#38BDF8` (sky) |
| Lines | All 1×n / n×1 pieces (Domino, Tromino, Tetra, Penta — both orientations) | `--color-piece-line` | `#4ADE80` (green) |
| 2×2 Square | Square-2 | `--color-piece-sq2` | `#F97316` (orange) |
| 3×3 Square | Square-3 | `--color-piece-sq3` | `#A78BFA` (violet) |
| Small L | L2-NE / L2-SE / L2-SW / L2-NW | `--color-piece-l2` | `#FACC15` (yellow) |
| Big L | L3-NE / L3-SE / L3-SW / L3-NW | `--color-piece-l3` | `#F472B6` (pink) |

#### Extended catalog (post-v1, optional)

T / S / Z tetrominoes in all four rotations. Off by default.

### 3.3 Tray

- The player is shown **three pieces in a tray** below the board.
- Pieces in the tray are sampled uniformly at random from the catalog **with replacement** at refill time (no anti-frustration weighting in v1; we can tune later if needed).
- The tray only refills when **all three pieces have been placed**. The player must place all three before the next set appears.
- Each piece may be placed exactly once per refill.

## 4. Turn Flow

1. Game starts: board empty, tray of 3 pieces generated, score 0, combo streak 0.
2. The player **drags** a piece from the tray onto the board.
3. A drop is **legal** if every cell of the piece lands on an empty in-bounds cell.
   - Illegal drops snap the piece back to its tray slot.
   - Legal drops fill those cells with the piece's color, and the piece slot in the tray becomes empty.
4. Immediately after a legal placement, the engine **resolves clears**:
   - Identify all fully filled rows.
   - Identify all fully filled columns.
   - Clear all of them simultaneously (a cell that belongs to both a full row and a full column is cleared once).
5. The score is updated (see §5).
6. If the tray is empty, refill with three new pieces.
7. Check **game over** condition (§6). If not over, return to step 2.

## 5. Scoring

The scoring system is the **Block Blast tiered model**, adapted.

### 5.1 Placement points

- **+1 point per cell** of the placed piece, awarded at placement time, regardless of any clears.
- Example: placing a 3×3 square scores **9** placement points.

### 5.2 Line-clear bonus

When a placement triggers clears, count `L = (rows cleared) + (columns cleared)` in that single move and award a bonus from this table:

| L | Bonus |
|---|---|
| 0 | 0 |
| 1 | 10 |
| 2 | 30 |
| 3 | 60 |
| 4 | 120 |
| 5 | 200 |
| 6 | 300 |
| 7+ | 300 + 50 × (L − 6) |

**Row + column simultaneity is captured by L.** Clearing one row and one column in the same move yields the 2-line bonus (30) automatically. There is no separate "cross" bonus — the tier table already rewards it.

### 5.3 Combo streak multiplier

A **streak** counts the number of consecutive placements that cleared at least one line.

- After a placement that clears lines (`L ≥ 1`), increment `streak` (starting from 0).
- After a placement that clears no lines (`L = 0`), reset `streak` to 0.
- The streak multiplier applied to the line-clear bonus of the current move is:

```
multiplier = 1 + 0.25 × max(0, streak - 1)
```

So the first clearing move is ×1.0, the second consecutive is ×1.25, the third ×1.5, etc. Multiplier caps at ×3.0 (after 9 consecutive clearing moves).

Multiplier applies **only to the line-clear bonus**, not to placement points.

### 5.4 Perfect clear

If, after resolution, the entire 10×10 board is empty, award an additional **+300 perfect-clear bonus** on top of everything else for that move. The streak multiplier does **not** apply to the perfect-clear bonus.

### 5.5 Score formula

For a single placement:

```
move_score = cells_placed
           + round( line_bonus(L) × multiplier(streak) )
           + perfect_clear_bonus
```

Total score is the running sum of `move_score` over the game.

### 5.6 Worked examples

- Place a 2×2 square on an empty board, no clears: `4 + 0 + 0 = 4`.
- Place a 1×5 line that completes one row, first clear of the game: `5 + round(10 × 1.0) + 0 = 15`.
- Next move places a piece that completes one row and one column simultaneously (3 cells placed, L=2, second consecutive clear): `3 + round(30 × 1.25) + 0 = 3 + 38 = 41`.
- A placement that clears the last filled cells leaving an empty board, L=2, streak now 5: `cells + round(30 × 2.0) + 300`.

## 6. Game Over

The game ends when **none of the three pieces currently in the tray can be legally placed anywhere on the board**.

- The check runs immediately after every placement (and after every tray refill).
- On game over, freeze the board, show final score, compare to stored high score, and offer "New game".
- Empty tray slots (already-placed pieces) are not considered — only the pieces still waiting.

## 7. Input & Interaction

- **Drag and drop** is the only input. Touch on iPad, mouse drag on desktop.
- While dragging, the piece follows the finger/cursor with a small **offset above the touch point** so the player can see what's under their finger on iPad.
- A **landing preview** is shown: the cells where the piece would land are highlighted (green if legal, red if illegal). This is not a "ghost piece"; it's a placement preview at the snapped grid position.
- Releasing on a legal position commits the placement. Releasing on an illegal position or off-board cancels and animates the piece back to its tray slot.
- **Implementation:** Pointer Events API (not Touch/Mouse Events). The dragged piece is an absolutely positioned ghost element following the pointer via `transform: translate3d(...)`. Hit-testing uses `document.elementsFromPoint(x, y)` against board cell elements — no manual rect math, no DPR computation.
- **The touch offset must be bounded so every cell stays reachable.** A constant pixel lift that exceeds the gap between the board edge and the screen edge makes the outermost row/column impossible to target once the board fills the safe space (the bottom-row-line failure, §8.9). Two rules together guarantee reachability in every orientation without the finger leaving the screen: (1) the lift is small relative to a cell; (2) hit-testing **snaps to the nearest cell** when the resolved point lands within ~one cell-pitch *just outside* a board edge — but still returns "no target" further out, so release-over-tray still cancels.
- No tap-to-place, no rotation gestures, no keyboard shortcuts in v1.

## 8. Visuals & Layout

### 8.1 Rendering & layout primitives

- **Rendering:** DOM only. The board is 100 `<div class="board__cell">` elements in a CSS Grid. The tray is 3 slot containers, each a small CSS Grid. **No Canvas, no SVG.**
- **Layout primitive:** CSS Grid is the *only* layout system inside the game. No flex, no floats, no absolute positioning except for the dragged-piece ghost. One mental model end to end.
- **Sizing:** the board is the **largest whole-pixel-celled square that fits the safe usable rectangle minus the auxiliary panel** (HUD + tray), in *either* orientation. `--cell-size` is **derived, not hard-coded**: a layout module measures the safe usable box and sets `--cell-size = floor(boardEdge / 10)` on `:root` (an integer px), recomputed on resize and `orientationchange`. Cell *gap*, *pad*, and *radius* remain static tokens. The grid itself still contains **no fractional units** — integer cell px is preserved, so no sub-pixel seams (the day-one invariant). Spare pixels (the `boardEdge mod 10` remainder) become even outer margin, never sub-pixel cell distribution. See §8.9.

### 8.2 CSS architecture

- Vanilla CSS with custom properties. No framework, no CSS Modules, no PostCSS.
- A single `src/styles/tokens.css` owns the visual language. Every other CSS rule consumes tokens; no magic numbers anywhere else.
- Class naming: BEM-lite (`.board`, `.board__cell`, `.tray`, `.tray__slot`).
- Cell state is carried as a `data-state` attribute with values `empty`, `filled`, `preview-ok`, `preview-bad`, `clearing`. Piece colour is carried as `style="--piece-color: var(--color-piece-…)"` on the cell. No nested DOM per cell.

### 8.3 Design tokens

Declared in `src/styles/tokens.css`. **Sizing is no longer chosen by device-width media queries** (that approach caused the landscape collapse — see §8.9). Instead:

- `--cell-size`, `--tray-cell-size`, `--tray-slot-size` are **runtime-derived**: the layout module measures the safe usable box for the current orientation and writes integer-px values onto `:root`. `tokens.css` declares only first-paint fallback values for them (used for the split-second before the layout module runs).
- `--cell-gap`, `--board-pad`, `--screen-pad`, `--radius`, all colours, motion, and z-index tokens are **static** and orientation-independent.
- There is **no `@media (max-width: …)` breakpoint** for sizing. The single adaptive layout (§8.7) keys off the **aspect ratio** (`@media (orientation: …)` / the layout module), not device width.

```
/* layout */
--cell-size: 64px;     /* first-paint fallback; live value derived per §8.1 */
--cell-gap: 4px;
--board-pad: 12px;
--radius: 6px;

/* motion */
--anim-duration: 180ms;
--anim-easing: cubic-bezier(0.2, 0.8, 0.2, 1);

/* Modern Dark palette */
--color-bg:         #0F172A;
--color-board:      #1E293B;
--color-cell-empty: #334155;
--color-text:       #F1F5F9;

--color-piece-single: #38BDF8; /* sky    — Single */
--color-piece-line:   #4ADE80; /* green  — all line pieces */
--color-piece-sq2:    #F97316; /* orange — 2×2 square */
--color-piece-sq3:    #A78BFA; /* violet — 3×3 square */
--color-piece-l2:     #FACC15; /* yellow — small L corners */
--color-piece-l3:     #F472B6; /* pink   — big L corners */

/* preview states */
--color-preview-ok:  rgba(74, 222, 128, 0.35);
--color-preview-bad: rgba(244, 63, 94, 0.35);
```

### 8.4 Style

- Flat solid colour fills. No gradients, no shadows, no textures, no images.
- Single `--radius` token applied to every rounded corner.
- Empty cells visibly distinct from board background (`--color-cell-empty` is lighter than `--color-board`).

### 8.5 Animation

- Animate only `opacity`, `transform`, and CSS custom properties. **Never** animate layout properties (`width`, `height`, `top`, `left`, `margin`, `padding`).
- One duration token (`--anim-duration` = 180ms).
- Clear: `opacity` 1 → 0.
- Placement: `opacity` + `transform: scale(0.85 → 1)`.
- Combo callout: `opacity` pulse, no layout shift. It is positioned **within the safe content box** (anchored to the HUD region, never the raw viewport top) so it can never land under the camera / Dynamic Island / status bar — see §8.9.
- `@media (prefers-reduced-motion: reduce)` zeroes all transitions.

### 8.6 Typography

- System font stack: `-apple-system, ui-sans-serif, system-ui, sans-serif`. No web fonts.
- Two sizes only:
  - HUD label: 16px.
  - Score number: 40px with `font-variant-numeric: tabular-nums`.

### 8.7 Layout structure

One adaptive layout, switched by **aspect ratio / orientation** (never device width). The board is always sized (§8.1, §8.9) to the dimension the chosen arrangement constrains, so it is always as large as the safe space allows.

- **Portrait (taller than wide):** vertical stack inside the safe box — HUD on top, board centred and **filling the safe width**, tray below the board. The board's size is constrained by the safe *width*.

- **Landscape (wider than tall):** the board is hugged to the **safe left edge and fills the safe height**; a single right-hand **side panel** holds the HUD on top and the 3-piece tray below it. The board's size is constrained by the safe *height*. HUD and tray never sit above/below the board in landscape (that is the small-board failure mode being designed out).

- **Board:** square, 10×10 cells, `--board-pad` on all sides, centred within whichever axis it does not fill.

- **Tray:** 3 equally-sized slots. The whole slot is the touch target; each slot stays ≥ the §8.8 minimum hit target in both orientations.

- **HUD:** current score and best score (large, tabular) plus the mute toggle. Lays out as a row in portrait, a column-friendly block in the landscape side panel.

- **Game-over overlay** and **start gate** remain full-viewport (`position: fixed; inset: 0`) and unaffected by orientation; their content is centred within the safe box.

### 8.8 Touch & accessibility

- Minimum hit target: 36px per board cell; full slot area for tray pieces.
- `prefers-reduced-motion` respected (see §8.5).
- Contrast: all foreground/background pairs hit WCAG AA (4.5:1) at minimum.
- Game-over and combo states announced via `aria-live` regions in addition to visuals.

### 8.9 Safe area & responsive sizing (load-bearing layout principles)

These exist because the original model broke in four ways, each a reusable lesson: (a) transient UI rendered under the camera / Dynamic Island in portrait; (b) a width-breakpoint + fixed-pixel layout fell back to iPad pixel sizes on a short landscape viewport, so the board overflowed and the tray dropped below the fold; (c) a constant drag-lift made the bottom row unreachable once the board sat flush to the safe-area edge (§7); (d) an intrinsically-sized auxiliary element collapsed after an orientation round-trip because WebKit did not recompute its `min-content` track.

**Safe area is mandatory.**

- `index.html` already sets `<meta name="viewport" … viewport-fit=cover>`. Every shell edge that bounds content uses `max(<token>, env(safe-area-inset-<side>))` on **all four sides**, so content clears the notch/camera/Dynamic Island (top in portrait; the left or right edge in landscape, depending on rotation) and the home indicator (bottom). This applies in both orientations.
- No fixed/absolutely-positioned element (combo callout, overlay content, start gate content) may occupy the inset zone. Such elements are positioned relative to the **safe content box**, not the raw viewport.

**The board fits the safe space; it never clips or scrolls off.**

- Board edge = `min(safe constrained dimension for the current arrangement) − auxiliary panel − pads`. Cell = `floor(edge / 10)` (integer px, §8.1). Recomputed on `resize` and `orientationchange`.
- The board is the priority element: it is always fully visible. If the derived cell size would fall below the **minimum legible/touch floor** (see §8.8; floor TBD during planning, candidate 24px), the page may scroll **as a graceful last resort** — but the board itself is never cropped, and this should not occur on any supported device in either orientation.

**Orientation is aspect-driven, not device-driven.** Layout branches on `orientation` (portrait/landscape), not on `max-width`. The same rules produce a correct layout on iPhone, iPad, and desktop at any window size — there are no device-class assumptions.

**Runtime-toggled layout is driven by explicit values, never browser intrinsic sizing.** Any element whose arrangement changes on a state toggle (orientation here; by extension theme/density in other apps) is sized from the same JS-derived custom properties as the board — e.g. the portrait tray pins to `--board-size` — not from `min-content`/`max-content` intrinsic tracks. WebKit does not reliably recompute intrinsic track sizing across an `orientationchange`/attribute flip, so an intrinsically-sized auxiliary element silently collapses on the return trip. If a size matters across a state change, compute it and write it down; don't ask the layout engine to re-derive it.

**Acceptance (must hold on iPhone & iPad, both orientations):** the entire board is visible without scrolling; the tray is reachable without scrolling; no HUD/board/tray/callout pixel sits under a safe-area inset; rotating the device re-fits within one frame with no sub-pixel seams.

## 9. Audio & Haptics

- **SFX events:** piece pickup, legal drop, illegal drop, line clear, combo, perfect clear, game over.
- **Music:** none in v1. Optional ambient track in a later release.
- **Mute toggle** persists across sessions.
- **Web Audio is locked until a real user gesture.** iOS/WebKit unlocks the `AudioContext` only from a genuine activation of the right class — a `click`/`pointerup` on a real control, **not** a drag — and the unlock must be (re)attempted **per page load**. The app therefore ships an explicit "tap to play" gate whose button click performs the unlock; binding unlock to several gesture types idempotently is the safety net. Never assume audio works just because buffers are decoded.
- **Haptics:** use the Web Vibration API where available (Android; not exposed on iOS Safari at the time of writing). On iOS, rely on subtle audio cues instead. The spec should not assume haptics work — it's best-effort.

## 10. Persistence

Stored in `localStorage`:

- `bestScore` — integer, highest score ever achieved on this device.
- `mute` — boolean.
- `lastGame` — optional snapshot (board state, tray, score, streak) so reloading the page resumes the in-progress game. Cleared on game over.

No remote storage, no accounts, no telemetry.

## 11. Out of Scope (v1)

- Multiplayer or asynchronous "send your score" features.
- Daily challenges, missions, levels, progression.
- Power-ups, bombs, themed boards.
- 3×3 sub-grid clears (1010!-style).
- Piece rotation.
- Undo.
- Localization (English-only UI; numerical-only HUD keeps this almost free anyway).
- Accessibility audit beyond color contrast and font size. (To be revisited.)

## 12. Acceptance Criteria for v1

The game is shippable when **all** of the following hold:

1. A new game starts with an empty board, three random pieces in the tray, score 0.
2. Pieces can be dragged and dropped only into legal positions; illegal drops snap back.
3. Full rows and full columns clear simultaneously after each placement.
4. Score updates per §5 and matches the worked examples exactly.
5. Combo streak multiplier increments and resets per §5.3.
6. Perfect-clear bonus fires when the board becomes empty mid-game.
7. The tray refills only after all three pieces are placed.
8. Game over fires exactly when no remaining tray piece can be placed anywhere.
9. Best score persists across reloads; the in-progress game resumes on reload.
10. Game is installable as a PWA and runs offline.
11. Smooth on a 6th-gen iPad in Safari (no dropped frames during normal play).

## 13. Open Questions

- **Piece distribution:** pure uniform random can produce frustrating tray combinations (three 3×3 squares). Do we want anti-frustration weighting in v1 (e.g. ensure at least one of the three pieces is small)? Default: no, revisit after first playtest.
- **High score reset:** should there be a UI to clear the best score? Default: no; advanced users can clear site data.

## 14. PWA delivery, updates & diagnosability

Learned from the deploy/version-badge incident: a correct build the device never loads is indistinguishable from a broken build.

- **A visible, build-tied version marker is mandatory.** A small on-screen identifier (here the `vN.M` badge, tied to the iteration number) is the cheapest possible answer to "is the new code even running?" — without it, every other debugging step is guesswork. It must out-stack *every* full-screen layer (start gate, game-over overlay) via an explicit top z-index token and be `pointer-events: none`, so it is readable in every state and never intercepts input.
- **Know the service-worker update lifecycle.** `registerType: 'autoUpdate'` (Workbox `skipWaiting` + `clientsClaim`) still does **not** refresh an already-open client until a reload, and an **iOS standalone PWA only checks/activates a new service worker on a cold relaunch** — force-quit (sometimes twice), worst case remove and re-add to the home screen. Precaching means *everything* is cache-first, so a bad deploy is sticky; keep `cleanupOutdatedCaches` on.
- **Write down the user-facing "how to get the new version" steps** next to the deploy instructions — it is not discoverable.
- **Versioning scheme:** integer tracks the iteration (`docs/iterations/NNNN`); a `.N` patch covers a fix shipped without its own iteration doc, resetting when the next iteration lands. A test pins the integer to the latest iteration so it cannot silently drift.

## 15. General principles for future PWA apps

App-agnostic; each line is a failure already paid for. Treat as a pre-ship checklist.

1. **Safe area is not optional.** `viewport-fit=cover` + `max(<token>, env(safe-area-inset-*))` on every content-bounding edge, all four sides, both orientations. No fixed/absolute element in the inset zone — position relative to the safe content box.
2. **Branch layout on aspect/orientation, never device width.** Width breakpoints + fixed pixels collapse on the next form factor.
3. **Derive responsive sizes in JS into integer-px CSS custom properties; CSS only consumes them.** Don't trust media-query pixel guesses, and don't trust browser intrinsic sizing (`min/max-content`) for anything that toggles at runtime — recompute and write the value down.
4. **The primary content element has sizing priority and is never clipped.** Scrolling is a graceful last resort, not a layout strategy.
5. **Bound every pointer/touch offset so screen-edge targets stay reachable**, and snap-to-nearest within a tolerance at edges.
6. **Ship a visible, build-tied version marker from day one.** Know the SW update lifecycle and the iOS cold-relaunch requirement; document how a user forces an update.
7. **Real-engine e2e (WebKit) is mandatory for layout, safe-area, touch, and intrinsic-sizing behaviour.** jsdom/unit tests cannot observe any of these — they are exactly where the expensive bugs live. Reproduce the bug in a real browser *before* fixing, keep the repro as a regression test.
8. **Treat platform media as locked until proven otherwise.** Web Audio needs a real user-gesture unlock (a click, not a drag), re-attempted per page load, behind an explicit start gate; assume nothing auto-plays.
9. **Prefer explicit, stateless CSS plus JS-written values over clever intrinsic/auto behaviour.** Anything stateful (orientation, theme) must fully reset by construction, not by hoping the engine re-derives it.

---

*Spec version: v1, 2026-05-17 — §8 layout reworked (aspect-driven orientation, safe-area mandate, runtime-derived whole-pixel board sizing). §7/§8.9 hardened with the bounded-touch-offset and explicit-vs-intrinsic-sizing lessons; §9 notes the Web Audio unlock requirement; §14 (PWA delivery & diagnosability) and §15 (general reusable principles) added from the session's bug learnings.*
