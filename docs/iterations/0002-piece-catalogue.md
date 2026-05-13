# Iteration 2 — Piece catalogue + sampler

**Date:** 2026-05-13.
**Status:** Complete.

## Goal

Encode the 19 pieces from SPEC §3.2 as data, and provide a deterministic, pure `samplePiece(rng)` that picks one uniformly at random. No DOM, no rendering. This unblocks tray rendering in iteration 3 and game-state logic later.

## Acceptance criteria

1. `src/pieces.ts` exports a `Piece` type with the shape:

   ```
   type Piece = {
     readonly id: string;
     readonly family: PieceFamily;
     readonly cells: ReadonlyArray<readonly [number, number]>;
     readonly bbox: { readonly w: number; readonly h: number };
   };
   ```

2. `PieceFamily` is the union `'single' | 'line' | 'sq2' | 'sq3' | 'l2' | 'l3'`.

3. `CATALOG: ReadonlyArray<Piece>` is exported and contains **exactly 19** pieces.

4. The catalogue covers every piece in SPEC §3.2:
   - `single` (1)
   - `domino-h`, `domino-v` (2)
   - `tromino-h`, `tromino-v` (2)
   - `tetra-h`, `tetra-v` (2)
   - `penta-h`, `penta-v` (2)
   - `square-2` (1)
   - `square-3` (1)
   - `l2-ne`, `l2-se`, `l2-sw`, `l2-nw` (4)
   - `l3-ne`, `l3-se`, `l3-sw`, `l3-nw` (4)

5. Every piece's `id` is unique and is the kebab-case slug shown above.

6. Every piece's `cells` are non-empty and lie within `[0, bbox.h) × [0, bbox.w)`.

7. L-shape cell layouts follow the convention "the suffix names the corner the L opens toward (the missing bbox corner for L2; the inner side for L3)":

   - **L2-NE** (opens NE):
     ```
     X .
     X X
     ```
   - **L2-SE** (opens SE):
     ```
     X X
     X .
     ```
   - **L2-SW** (opens SW):
     ```
     X X
     . X
     ```
   - **L2-NW** (opens NW):
     ```
     . X
     X X
     ```
   - **L3-NE** (opens NE):
     ```
     X . .
     X . .
     X X X
     ```
   - **L3-SE** (opens SE):
     ```
     X X X
     X . .
     X . .
     ```
   - **L3-SW** (opens SW):
     ```
     X X X
     . . X
     . . X
     ```
   - **L3-NW** (opens NW):
     ```
     . . X
     . . X
     X X X
     ```

8. `samplePiece(rng: () => number): Piece` returns a piece from `CATALOG`.
   - Given an `rng` returning `r ∈ [0, 1)`, the function picks index `Math.floor(r * CATALOG.length)`.
   - Determinism: identical `rng` calls produce identical outputs.
   - Throws or returns predictably (TBD by impl) if `rng` returns a value outside `[0, 1)` — tests should not exercise this edge case.

9. `samplePiece` does not mutate `CATALOG` or the returned piece.

## Out of scope

- Tray rendering (iteration 3).
- Anti-frustration sampling weights (open question in SPEC §13).
- Piece rotation, T/S/Z extended catalogue (post-v1 per SPEC §3.2).

## Test plan

- **Vitest:** test cell counts per family, bounding-box constraints, uniqueness of IDs, total of 19, fixture-based L-shape layouts, sampler determinism with a seeded RNG (e.g. mulberry32 in the test file), sampler covers every index across a brute-force sweep, sampler is pure (no mutation).

## What landed

- `src/pieces.ts` — `Piece` type, `PieceFamily` union, `CATALOG` (19 readonly pieces), `samplePiece(rng)` pure function.
- `tests/pieces.test.ts` — 33 tests: catalogue invariants, family/size table, L-shape fixtures.
- `tests/sample-piece.test.ts` — 5 tests: CATALOG referential containment, determinism, index mapping, exhaustive reachability, non-mutation.

## Verifier findings

- All 9 acceptance criteria satisfied.
- No convention violations: no `any`, no non-null assertions, no unsafe casts (only `as const`), no DOM/Canvas/SVG, no magic numbers, vocabulary aligned with `CONTEXT.md`.
- L-shape visual sanity check passed for all 8 L pieces.
- No duplicate cell-sets across the catalogue.
- `samplePiece` edge case (rng ≥ 1) throws with a useful message; mulberry32 used in tests is in-contract.

## Final state

- Vitest: 56 passed / 0 failed (6 files).
- Typecheck: green.
- Playwright: not run (no e2e yet).

## Deferred follow-ups (verifier suggestions, not blocking)

1. Canonicalised-cell-set uniqueness test — future-proofs against accidental duplicates when extending the catalogue (e.g. adding T/S/Z post-v1).
2. Runtime `Object.freeze` on `CATALOG` and its members for belt-and-suspenders immutability.
3. Property-based test for `samplePiece` covering random `r ∈ [0, 1)`.

## Next — iteration 3

Render the tray below the board: a `Tray` DOM element with three slots, each rendering a sampled piece as a mini-grid using `--cell-size` (scaled down) and the family colour tokens. Wires `samplePiece` into the page for the first time. Still no input.
