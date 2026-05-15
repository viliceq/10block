# 10Block

**A free, open-source 10×10 block puzzle.** Same family as *Block Blast*, *1010!*, and *Wood Block Puzzle* — but no ads, no tracking, no paywalls. Built as a Progressive Web App: iPad, iPhone, Android, desktop. Online or off.

> Status: v1 feature-complete · 288 tests · TypeScript strict mode

## Play

**→ [10block.pages.dev](https://10block.pages.dev)**

Or run it locally — see **Run it yourself** below.

## How it works

- A 10 × 10 grid. Each turn the tray below the board offers you three pieces.
- Drag a piece onto the board. It lands where you drop it. No rotation.
- Fill a row or column entirely and it clears.
- Clear multiple lines at once (or build a streak) for combo bonuses. Empty the entire board for a perfect-clear bonus.
- The game ends when **none** of the three current tray pieces fits anywhere.

Score formula, the 19-piece catalogue, and every other rule live in [`SPEC.md`](./SPEC.md).

## Install to your home screen

10Block is a real PWA — install it once and it behaves like a native app:

- **iPad / iPhone (Safari)** — tap the share icon → *Add to Home Screen*.
- **Android / desktop Chrome, Edge, Brave** — look for the install icon in the address bar.

Once installed, the game:

- Launches full-screen with no browser chrome.
- Runs **fully offline** after the first load (every asset is precached by a service worker).
- Remembers your **best score** across sessions.
- **Resumes** the in-progress game if you close the tab mid-move.

## Run it yourself

Requirements: Node 22+ and a recent npm.

```bash
git clone <repo-url>
cd blockly
npm run refresh-npm-min-age   # roll the supply-chain cutoff forward
npm install
npm run dev                   # http://localhost:5173
```

Production build (emits the service worker + manifest):

```bash
npm run build
npm run preview               # serves dist/
```

The full test suite:

```bash
npm test            # vitest watch
npm run typecheck   # strict TS check
```

## What's in the box

- **Drag-and-drop with live preview** — the cells where the piece will land light up green (legal) or red (illegal) in real time.
- **Snappy SFX + best-effort haptics** — seven short cues for pickup / place / reject / clear / combo / perfect / game-over. Mute toggle in the HUD.
- **Combo callout** — a brief "COMBO ×N" badge when you chain clears.
- **Modern Dark palette** — calm, colourblind-friendly, low stimulation.
- **Two screen sizes** — iPad-portrait (default) and iPhone-portrait (auto via media query).
- **No accounts, no telemetry, no network calls during gameplay.**

## Tech

Vanilla TypeScript + Vite + Vitest + Playwright. No UI framework, no CSS framework, no state-management library. The game is one screen and stays that way. The drag layer uses native Pointer Events and `document.elementsFromPoint`; the engine is a small set of pure functions (`canPlace`, `applyPlacement`, `resolveClears`, `hasAnyLegalPlacement`, `lineBonus`, `streakMultiplier`).

Why this approach: the codebase has stayed under ~2 000 lines of source through 20 small TDD iterations, every visual rule is a token, and every behaviour change is reviewed by a fresh-context verifier before commit. The full workflow + conventions live in [`CLAUDE.md`](./CLAUDE.md); the design vocabulary in [`CONTEXT.md`](./CONTEXT.md); per-slice decision logs in [`docs/iterations/`](./docs/iterations/).

## Deployment

10Block deploys on **Cloudflare Pages** at [10block.pages.dev](https://10block.pages.dev), via GitHub Actions (see [`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

Deployment is driven entirely from GitHub Actions — Cloudflare's own Git-connected build is **not** used (its unified Workers-Builds flow is awkward for static Pages sites and its auto-generated build token is Workers-scoped, not Pages-scoped). The Cloudflare project is a plain **Direct Upload** Pages project; GitHub Actions pushes to it with `wrangler pages deploy`.

To set up your own deploy:

1. Push the repo to GitHub.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Upload assets** (the *non*-Git path). Name the project `10block`, production branch `main`. Do one manual upload of a `dist/` build to establish the project.
3. Create a Cloudflare API token scoped to **Account · Cloudflare Pages · Edit**.
4. Add two GitHub repository secrets:
   - `CLOUDFLARE_API_TOKEN` — the token from step 3
   - `CLOUDFLARE_ACCOUNT_ID` — your Cloudflare account ID
5. Push to `main`. The `deploy` job in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs after the test job passes and ships `dist/`.

Cloudflare serves the static files (HTML, JS, CSS, MP3s, icons) on a global CDN with HTTPS by default — everything a PWA's service worker needs. A custom domain can be added later in the project's Cloudflare settings.

### CI / CD

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) has two jobs:

- **test** — type-check + 288 unit tests + production build, on every push and PR.
- **deploy** — runs only on push to `main`, only after `test` is green; builds and `wrangler pages deploy dist`. Tests gate the deploy.

### Supply-chain note for CI / production

The committed `.npmrc` caps installs to versions published before a fixed date (currently `2026-04-15`). GitHub Actions honours the same cutoff via the committed `package-lock.json` (`npm ci`). Before adding or upgrading dependencies, run `npm run refresh-npm-min-age` locally so the cutoff rolls forward to *today minus 30 days*, then commit the updated `.npmrc` + lockfile.

## Privacy

10Block does not phone home. Once the static assets are loaded (or precached for offline play), nothing — score, mute setting, last game — leaves your device. `localStorage` is the only persistence layer.

## Licence

*To be decided.* The intent is an OSI-approved permissive licence (MIT or Apache 2.0); pick one before the first public release.

## Acknowledgements

Inspired by the gameplay of *Block Blast*, *1010!*, and *Wood Block Puzzle*. None of those projects are affiliated with this one; 10Block is an independent open-source implementation.
