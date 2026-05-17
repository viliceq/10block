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
| `npm run build` | Production build (emits manifest + service worker via vite-plugin-pwa) |
| `npm run generate:icons` | Regenerate PNG home-screen icons from `public/icons/icon.svg` |
| `npm run refresh-npm-min-age` | Roll the `.npmrc` `before=` cutoff forward (run monthly, see below) |

## Workflow — iteration loop

Each piece of work is one **iteration**, a small TDD slice. Loop:

1. Define the slice in `docs/iterations/NNNN-<slug>.md` (one sentence + acceptance criteria).
2. Dispatch the **`test-author`** subagent — writes failing tests; does not touch `src/`.
3. Human reviews the tests.
4. Dispatch the **`implementer`** subagent — minimal code to make tests pass.
5. The `PostToolUse` hook in `.claude/settings.json` runs `npm run test:run` on every `src/**` or `tests/**` edit. Treat hook failures as the immediate next thing to fix.
6. Dispatch the **`verifier`** subagent (fresh context) — full suite + typecheck + spec conformance review.
7. Bump `APP_VERSION` in `src/version.ts` to `v<this-iteration>` (or a `.N` patch for a fix with no iteration doc). A test pins it to the latest `docs/iterations` number, so a stale value fails the suite.
8. Append outcome to the iteration log; commit.

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

## Dependencies and supply-chain hygiene

Project-level `.npmrc` carries a rolling `before=<YYYY-MM-DD>` cutoff. npm will refuse to install package versions published more recently than that date. The goal is to give the community ~30 days to detect a malicious version before we pick it up.

**Before any `npm install` session**, run `npm run refresh-npm-min-age` to roll the cutoff to *today minus 30 days*. Without that, you might be installing against a date many months stale (unnecessarily old transitive deps) or, worse, forgetting the cutoff entirely.

The shipped `.npmrc` is committed; the refresh script overwrites the `before=` line in place.

## Decisions

ADRs live in `docs/adr/`. Create one only when the decision is (1) hard to reverse, (2) surprising without context, (3) the product of a real trade-off. Otherwise no ADR.

## Out of scope (do not implement)

See SPEC.md §11. Specifically excluded from v1: piece rotation, undo, 3×3 sub-grid clears, multiplayer, themes, daily challenges, levels, ads.
