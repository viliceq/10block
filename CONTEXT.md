# Blockly — Domain Language

The vocabulary used in `SPEC.md`, code, tests, commit messages, and ADRs. Keep this list and the code in sync. When new domain concepts appear, add them here before naming them in code.

| Term | Meaning |
|---|---|
| **Board** | The 10 × 10 playing field. |
| **Cell** | One of 100 grid positions on the board; either `empty` or `filled`. |
| **Piece** | A polyomino from the catalogue (SPEC §3.2). Has a fixed shape and a colour family. |
| **Catalogue** | The 37 distinct pieces available in v1 (each rotation is a separate entry). |
| **Family** | A group of pieces that share a colour. Twelve: Single, Lines, 2×2 Square, 3×3 Square, Small L (`l2`), Big L (`l3`), and the iteration-30 Tetris/Block-Blast set — T (`tetro-t`), L (`tetro-l`), J (`tetro-j`, L's mirror), S (`tetro-s`), Z (`tetro-z`, S's mirror), 2×3 rectangle (`rect-23`). |
| **Tray** | The row of three pieces shown to the player. Refills only when all three have been placed. |
| **Slot** | One of the three positions in the tray. |
| **Placement** | A single legal drop of a piece onto the board. |
| **Clear** | The removal of a fully filled row or column after a placement. |
| **L** | In scoring, the number of lines (rows + columns) cleared by a single placement. |
| **Combo streak** | The count of consecutive placements that produced at least one clear. Resets to 0 on a non-clearing placement. |
| **Perfect clear** | The state where the board is empty after a placement; awards a 300-point bonus. |
| **Ghost piece** | The absolutely positioned element that follows the pointer during drag. |
| **Preview** | The highlighted cells showing where a dragged piece would land. States: `preview-ok` / `preview-bad`. |
| **HUD** | Score readout and combo indicator at the top of the screen. |
| **Token** | A CSS custom property defined in `src/styles/tokens.css`. |
| **BoardState** | Pure-data representation of the board: a 10×10 grid of `CellState`. Indexed `board[row][col]`. Lives in `src/engine.ts`. |
| **CellState** | Value of a single board cell: `null` (empty) or a `PieceFamily` (filled, carrying that family's colour). |
| **Anchor** | The `(row, col)` where a piece's bounding-box origin `(0, 0)` lands on the board. Piece cell `(r, c)` therefore lands at `(anchorRow + r, anchorCol + c)`. |
| **canPlace** | Pure predicate: returns whether a piece fits at a given anchor on a given board (all landing cells in-bounds and empty). |
| **ClearResult** | The return shape of `resolveClears(board)`: `{ board: BoardState, rowsCleared: ReadonlyArray<number>, colsCleared: ReadonlyArray<number> }`. `rowsCleared.length + colsCleared.length` is **L** in the scoring formula. |
| **Placement points** | The `piece.cells.length` portion of a move's score (SPEC §5.1). One point per cell placed. |
| **Line bonus** | The score awarded by `lineBonus(L)` per SPEC §5.2. Multiplied by the streak multiplier before being added to the move score. |
| **Move score** | The total score added for a single placement: `placementPoints + round(lineBonus(L) × streakMultiplier(streak)) + perfectClearBonus`. Defined by SPEC §5.5. |
| **Perfect-clear bonus** | A flat **300** awarded when the board is entirely empty after `resolveClears`. The streak multiplier does **not** apply (SPEC §5.4). |
| **Score** | Running sum of all move scores in the current game. Exposed by `game.score`. |
| **gameOver** | A read-only boolean on `GameApi`. True iff none of the non-null tray pieces can be legally placed anywhere on the current board (SPEC §6). Recomputed after every `place` (including refill) and at construction. |
| **newGame** | A `GameApi` method that resets `boardState` to empty, `score`/`streak`/`gameOver` to their initial values, refills the tray, and re-renders. The "New game" button on the overlay calls it. |
| **initialBoard** | An optional `GameOptions` parameter. When provided, the controller starts with this `BoardState` instead of an empty grid. Used by tests to set up near-locked scenarios; also the eventual hook for SPEC §10 "resume game" persistence. |
| **Overlay** | The full-viewport `.overlay` surface that appears when `gameOver` is true. Shows "GAME OVER", the final score, and a "New game" button. |
| **bestScore** | Read-only `GameApi` field. Highest `score` ever achieved on this device. Persisted to `localStorage` under `blockly:bestScore`. Preserved across `newGame()`. Updated only when the current `score` strictly exceeds it. |
| **LastGame** | The persistence shape for the resume-game snapshot: `{ board: BoardState, trayIds: ReadonlyArray<string | null>, score: number, streak: number }`. Persisted under `blockly:lastGame` after every successful `place`, and removed by `clearLastGame()` when the game ends or the player starts a new one. |
| **trayIds** | The persistence-side representation of the tray: piece `id` strings (or `null` for empty slots) in slot order. Rehydrated to `Piece` references via `findPieceById`; unknown ids degrade to `null` (catalog drift). |
| **AudioApi** | The SFX/haptics contract: `pickup`, `place`, `reject`, `clear`, `combo`, `perfect`, `gameOver` event methods plus `setMuted` / `isMuted` / `unlock`. Two implementations: `createAudio()` decodes `/sounds/*.mp3` into `AudioBuffer`s once via the **Web Audio API** and fires a fresh `AudioBufferSourceNode` per event (low-latency, overlapping) plus `navigator.vibrate`; `createSilentAudio()` is a no-op used in tests. |
| **mute** | A boolean persisted under `blockly:mute`. When true, all `AudioApi` event methods are no-ops (audio + haptics). Toggled via the HUD's `.hud__mute` button. |
| **unlock** | `AudioApi.unlock()` — the iOS Web Audio unlock. `resume()` is async, so the empty-buffer prime is chained to `resume().then(...)` and only runs once `ctx.state === 'running'`; `unlocked` latches only after the prime truly plays, so every gesture retries until it sticks. `fire()` runs the same `ensureUnlocked()`, and `main.ts` binds it to `pointerdown`/`touchend`/`click` (idempotent), so whichever gesture comes first drives it. |
| **Start gate** | The one-time `.start-gate` "Tap to play" overlay shown on every page load (`src/start-gate.ts`). Its real `<button>` click is the iOS/WebKit user activation that unlocks Web Audio — a drag never produces a `click`, so without it audio stays locked. Dismissed (`display:none`) after the first click; reappears each load since the gesture requirement is per-page-load. |
| **computeLayout** | Pure, DOM-free function (`src/layout.ts`) implementing SPEC §8.1/§8.9: given viewport, safe-area insets, and the spacing tokens, it folds insets with `--screen-pad` (`max` per side), picks **Orientation** by aspect (`contentW > contentH` → landscape, else portrait), and sizes the board from the constrained dimension (width in portrait, height in landscape) as `floor((budget − 2·boardPad − 9·gap)/10)` integer cells. Never clips: clamps to `minCell` and reports `overflow` instead. |
| **Layout** | `computeLayout`'s return: `{ orientation, cellSize, boardSize, trayCellSize, traySlotSize, overflow }`, all sizes integer px. `boardSize = 2·boardPad + 10·cellSize + 9·gap`; spare pixels are even outer margin. `overflow` ⇒ the page may scroll as a last resort (board still never clipped). The **ViewportBinder** writes these onto `:root`. `LayoutInput` takes `hudWidth` (consulted only in landscape, side-panel width) and `hudHeight` (consulted only in portrait, stacks above the board) — not a single `hudExtent`. |
| **ViewportBinder** | `src/viewport.ts`. `createViewportBinder({ appEl, root, measure, subscribe? })` runs `computeLayout(measure())` and writes `--cell-size`/`--board-size`/`--tray-cell-size`/`--tray-slot-size` onto `root.style` plus `data-orientation`/`data-overflow` on `appEl`, on construction and on every `subscribe` trigger (default: rAF-coalesced `resize`+`orientationchange`); `destroy()` unbinds. `createDomMeasure({appEl,hudEl,root})` builds the production `measure`: viewport from `window.inner*`, safe-area insets via a hidden fixed `env(safe-area-inset-*)` padding probe read back through `getComputedStyle`, spacing tokens from `:root`, HUD box from `getBoundingClientRect`. The DOM-measuring path is covered by device/e2e, not jsdom. |
| **Manifest** | The web app manifest at `dist/manifest.webmanifest`, generated by `vite-plugin-pwa` from the config in `vite.config.ts`. Tells the OS the app's name, theme/background colour, icons, and start URL so it can be installed to the home screen. |
| **Service Worker** | Generated by `vite-plugin-pwa` (Workbox) as `dist/sw.js`. Precaches every JS/CSS/HTML/PNG/SVG/MP3/webmanifest asset on first load so the game runs fully offline. Auto-updates on new deploys (`registerType: 'autoUpdate'`). |
