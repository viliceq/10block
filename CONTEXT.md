# Blockly — Domain Language

The vocabulary used in `SPEC.md`, code, tests, commit messages, and ADRs. Keep this list and the code in sync. When new domain concepts appear, add them here before naming them in code.

| Term | Meaning |
|---|---|
| **Board** | The 10 × 10 playing field. |
| **Cell** | One of 100 grid positions on the board; either `empty` or `filled`. |
| **Piece** | A polyomino from the catalogue (SPEC §3.2). Has a fixed shape and a colour family. |
| **Catalogue** | The 19 distinct pieces available in v1. |
| **Family** | A group of pieces that share a colour. Six in v1: Single, Lines, 2×2 Square, 3×3 Square, Small L, Big L. |
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
