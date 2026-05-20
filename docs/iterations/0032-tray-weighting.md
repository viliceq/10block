# Iteration 32 — Family-weighted tray with at-least-one-easy

**Date:** 2026-05-20.
**Status:** Complete.

## Verifier outcome

377 vitest + typecheck green; e2e unchanged. The `findSeedWithPieces` helper in `game.test` now searches the *actual* dealing path (`sampleTray`) so the SPEC §5.6 / streak-reset tests stay decoupled from the catalogue order.

## Goal

Restore the Block-Blast "thrill": after iteration 30 the bag became uniform over 37 entries, so rotation-heavy families (T/L/J) and big awkward shapes (3×3, 2×3, pentas, S/Z) crowded out the small, flexible pieces that build and close lines. Switch the tray to **family-weighted** sampling (weight by family, not per-rotation) with an **anti-frustration guarantee** that at least one of the three tray pieces is from an "easy" family. Resolves the SPEC §13 anti-frustration open question.

## Model

- `FAMILY_WEIGHTS` (relative): line 12, sq2 6, single 5, l2 5, tetro-t/l/j 3, tetro-s/z 2, rect-23 2, sq3 1, l3 1.
- `EASY_FAMILIES`: `single`, `sq2`, `l2` (small, near-always placeable). `line` is **not** "easy" — it spans 2–5 cells, and a 5-long on a partial board isn't trivial — but the heavy `line` weight already makes lines abundant.
- `samplePieceWeighted(rng)`: pick a family by weight, then a rotation **uniformly within that family** — so a 4-rotation family doesn't outweigh a 2-rotation one just by having more entries.
- `sampleTray(rng, size)`: draw `size` pieces with `samplePieceWeighted`; if **none** is from `EASY_FAMILIES`, replace slot 0 with a uniform pick from the easy pool (one extra `rng()` call, deterministic). With these weights this triggers on ~27% of hands.
- `samplePiece` (the existing uniform sampler) is **retained** as a low-level utility for tests; the game uses `sampleTray`.

## Acceptance criteria

1. `pieces.ts` exports `FAMILY_WEIGHTS`, `EASY_FAMILIES`, `samplePieceWeighted`, `sampleTray`. Uniform `samplePiece` unchanged.
2. `samplePieceWeighted` is deterministic for a given rng; piece is always in `CATALOG`; over a large N the empirical family distribution matches `FAMILY_WEIGHTS` within tolerance.
3. Within a family, rotations are uniformly distributed.
4. `sampleTray(rng, n)` returns `n` pieces, deterministic, and **every** tray contains ≥1 piece from `EASY_FAMILIES`.
5. `game.ts refillTray` uses `sampleTray`; the seeded `findSeedWithPieces` helper in `game.test` updated to call `sampleTray` (predicts the real bag); the `SPEC §5.6` and streak-reset tests adapt to find the right penta-h slot positions dynamically (no fixed slot 0/1 assumption).
6. SPEC §3.3 + §13 updated; CONTEXT.md gains entries for `sampleTray` / weights.
7. Full unit + e2e + typecheck green. `APP_VERSION` → `v32`.

## Tuning note

These weights are an opinionated starting point — easy to tweak after device play. The design is to widen the lever, not lock in numbers.

## Files

- `src/pieces.ts`, `src/game.ts`, `src/version.ts`
- `tests/sample-piece.test.ts` (new weighted/tray tests), `tests/game.test.ts` (adapt seed-coupled tests)
- `SPEC.md` §3.3 + §13, `CONTEXT.md`
