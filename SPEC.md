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
- **Orientation:** Both portrait and landscape on iPad; portrait only on iPhone.
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
- No tap-to-place, no rotation gestures, no keyboard shortcuts in v1.

## 8. Visuals & Layout

### 8.1 Rendering & layout primitives

- **Rendering:** DOM only. The board is 100 `<div class="board__cell">` elements in a CSS Grid. The tray is 3 slot containers, each a small CSS Grid. **No Canvas, no SVG.**
- **Layout primitive:** CSS Grid is the *only* layout system inside the game. No flex, no floats, no absolute positioning except for the dragged-piece ghost. One mental model end to end.
- **Sizing:** integer pixels via design tokens (see §8.3). Cell size and gap are declared once and consumed everywhere. No `%`, no `vw` inside the board. Viewport units only at the outermost centring container.

### 8.2 CSS architecture

- Vanilla CSS with custom properties. No framework, no CSS Modules, no PostCSS.
- A single `src/styles/tokens.css` owns the visual language. Every other CSS rule consumes tokens; no magic numbers anywhere else.
- Class naming: BEM-lite (`.board`, `.board__cell`, `.tray`, `.tray__slot`).
- Cell state is carried as a `data-state` attribute with values `empty`, `filled`, `preview-ok`, `preview-bad`, `clearing`. Piece colour is carried as `style="--piece-color: var(--color-piece-…)"` on the cell. No nested DOM per cell.

### 8.3 Design tokens

Declared in `src/styles/tokens.css`. On narrow viewports (iPhone portrait, `@media (max-width: 430px)`) a media block overrides the sizing tokens so the whole game fits on small phones:

| Token | iPad default | iPhone override |
|---|---|---|
| `--cell-size` | 64px | 32px |
| `--cell-gap` | 4px | 2px |
| `--board-pad` | 12px | 6px |
| `--screen-pad` | 24px | 12px |
| `--tray-cell-size` | 28px | 16px |
| `--tray-slot-size` | 168px | 84px |

Sizing math: board = `10 × 32 + 9 × 2 + 2 × 6 = 350px`; layout = `350 + 24 = 374px`. Fits iPhone SE (375px) and every newer iPhone in portrait.

Colours, motion tokens, and z-index tokens are not overridden.

```
/* layout */
--cell-size: 64px;     /* iPad portrait */
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
- Combo callout: `opacity` pulse, fixed position, no layout shift.
- `@media (prefers-reduced-motion: reduce)` zeroes all transitions.

### 8.6 Typography

- System font stack: `-apple-system, ui-sans-serif, system-ui, sans-serif`. No web fonts.
- Two sizes only:
  - HUD label: 16px.
  - Score number: 40px with `font-variant-numeric: tabular-nums`.

### 8.7 Layout structure

- **Screen:** vertical stack — HUD on top, board centred, tray below (portrait). On iPad landscape, tray sits to the right of the board.
- **Board:** square, 10×10 cells, surrounded by `--board-pad` on all sides.
- **Tray:** 3 equally-sized slots; each slot ≥ 96px on iPad so a piece can be comfortably tapped and grabbed.
- **HUD:** current score (large, tabular) and best score side by side.

### 8.8 Touch & accessibility

- Minimum hit target: 36px per board cell; full slot area for tray pieces.
- `prefers-reduced-motion` respected (see §8.5).
- Contrast: all foreground/background pairs hit WCAG AA (4.5:1) at minimum.
- Game-over and combo states announced via `aria-live` regions in addition to visuals.

## 9. Audio & Haptics

- **SFX events:** piece pickup, legal drop, illegal drop, line clear, combo, perfect clear, game over.
- **Music:** none in v1. Optional ambient track in a later release.
- **Mute toggle** persists across sessions.
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

---

*Spec version: v1 draft, 2026-05-13 — visual design locked.*
