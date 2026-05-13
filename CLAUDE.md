# Blockly — Working notes for Claude

A block-puzzle PWA for iPad Safari. See **`SPEC.md`** for the product spec and **`CONTEXT.md`** for the domain language. Always read both at the start of a new session.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server on http://localhost:5173 |
| `npm test` | Vitest in watch mode (interactive) |
| `npm run test:run` | Single Vitest run (used by the post-edit hook) |
| `npm run test:e2e` | Playwright e2e tests |
| `npm run typecheck` | TypeScript check, no emit |
| `npm run build` | Production build |

## Workflow — iteration loop

Each piece of work is one **iteration**, a small TDD slice. Loop:

1. Define the slice in `docs/iterations/NNNN-<slug>.md` (one sentence + acceptance criteria).
2. Dispatch the **`test-author`** subagent — writes failing tests; does not touch `src/`.
3. Human reviews the tests.
4. Dispatch the **`implementer`** subagent — minimal code to make tests pass.
5. The `PostToolUse` hook in `.claude/settings.json` runs `npm run test:run` on every `src/**` or `tests/**` edit. Treat hook failures as the immediate next thing to fix.
6. Dispatch the **`verifier`** subagent (fresh context) — full suite + typecheck + spec conformance review.
7. Append outcome to the iteration log; commit.

**Never skip tests.** A red suite blocks moving on.

## Conventions

- **TypeScript**: strict mode + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`. No `any`.
- **CSS**: vanilla. BEM-lite class names (`.board`, `.board__cell`, `.tray`, `.tray__slot`). All visual values are tokens from `src/styles/tokens.css` (created in iteration 1).
- **DOM only.** No Canvas. No SVG inside the game.
- **State on cells**: a `data-state` attribute (`empty` | `filled` | `preview-ok` | `preview-bad` | `clearing`). Piece colour as a CSS custom property `--piece-color`.
- **No web fonts.** System font stack.
- **Animate only `opacity`, `transform`, and CSS custom properties.** Never layout properties.
- **No comments that re-state code.** Comments only for non-obvious *why*.
- **Test against state, not pixels.** Use `data-state` attributes and exported state functions; never inspect computed CSS pixel widths.

## Decisions

ADRs live in `docs/adr/`. Create one only when the decision is (1) hard to reverse, (2) surprising without context, (3) the product of a real trade-off. Otherwise no ADR.

## Out of scope (do not implement)

See SPEC.md §11. Specifically excluded from v1: piece rotation, undo, 3×3 sub-grid clears, multiplayer, themes, daily challenges, levels, ads.
