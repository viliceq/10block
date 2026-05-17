# Iteration 30 — Tetris + Block Blast shape families

**Date:** 2026-05-17.
**Status:** Complete.

## Goal

Add the missing classic-Tetris tetrominoes and a Block Blast rectangle (user-drawn, reviewed via `shapes-preview.html`, approved with mirror twins and the proposed colours). Rotations are pre-generated catalogue entries — consistent with the existing `l2`/`l3` approach; in-game rotation stays out of scope (SPEC §11).

## Scope

Six new families, 18 pieces, added to `CATALOG`:

| Family | id prefix | colour | pieces |
|---|---|---|---|
| T-tetromino | `tetro-t` | `#9333EA` purple | up, right, down, left (4) |
| L-tetromino | `tetro-l` | `#D97706` amber | 0, 90, 180, 270 (4) |
| J-tetromino (mirror of L) | `tetro-j` | `#2563EB` blue | 0, 90, 180, 270 (4) |
| S-tetromino | `tetro-s` | `#16A34A` green | 0, 90 (2) |
| Z-tetromino (mirror of S) | `tetro-z` | `#EF4444` red | 0, 90 (2) |
| 2×3 rectangle | `rect-23` | `#14B8A6` teal | h (2×3), v (3×2) (2) |

`CATALOG` grows 19 → 37. Cell layouts are exactly those validated in the approved preview.

## Acceptance criteria

1. `PieceFamily` gains `tetro-t | tetro-l | tetro-j | tetro-s | tetro-z | rect-23`.
2. 18 new `CATALOG` entries with the ids/colours/cells above; every cell within its bbox, no dup cells, unique ids; `CATALOG.length === 37`.
3. Each rotation of a family is geometrically distinct; mirror families are reflections, not rotations, of their twin.
4. `tokens.css` declares the six new `--color-piece-*` tokens with the approved hexes (the `--piece-color` mapping in `board.ts`/`tray.ts` already keys off `family`, so no render code changes).
5. SPEC §3.2 colour table and `CONTEXT.md` (Family/Catalogue glossary, count 19 → 37) updated.
6. Existing piece/sample/tokens tests updated to the new count and families; full suite + typecheck green.
7. `APP_VERSION` → `v30`.

## Notes / trade-offs

- Distribution: `samplePiece` is uniform over `CATALOG`; 37 pieces makes the mix richer and the game somewhat harder (more large/awkward pieces). Acceptable and intended; anti-frustration weighting remains a SPEC §13 open question, not addressed here.
- No engine/drag/scoring changes — `canPlace`/`applyPlacement`/`resolveClears` are shape-agnostic.

## Latent bug found & fixed at the root

Adding families exposed a hand-maintained duplicate: `storage.ts` had its own `VALID_FAMILIES` allowlist used to validate persisted snapshots. It silently rejected any `lastGame` whose board contained a new family → resume broke (a fresh game with score 0). Fixed by deriving the single source of truth: `pieces.ts` now exports `PIECE_FAMILIES` (computed from `CATALOG`); `storage.ts` imports it. Regression tests: `PIECE_FAMILIES` ≡ catalogue families; `loadLastGame` accepts a board cell with a new family. This is exactly the "single source of truth / don't duplicate" principle (`docs/pwa-principles.md` §2) — the kind of duplication that rots silently.

## Files

- `src/pieces.ts`, `src/styles/tokens.css`
- `tests/pieces.test.ts`, `tests/sample-piece.test.ts`, `tests/tokens.test.ts`
- `SPEC.md` §3.2, `CONTEXT.md`, `src/version.ts`
