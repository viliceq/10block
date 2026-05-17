# PWA engineering principles

A portable, project-agnostic checklist for building installable web apps that behave on real phones and tablets. Every item is a bug already paid for — the **Rule** is what to do, the **Why** is the failure it prevents. Copy this file into new projects and have the project spec link to it.

> Origin: distilled from the 10Block PWA build. Wording is deliberately app-neutral so it travels.

---

## 1. Layout & safe area

- **Safe area is not optional.**
  Set `<meta name="viewport" … viewport-fit=cover>` and pad **every content-bounding edge** with `max(<your-spacing-token>, env(safe-area-inset-<side>))` — all four sides, both orientations.
  *Why:* without it, content renders under the notch / Dynamic Island / camera (top in portrait, a side in landscape) and the home indicator (bottom). `env()` only resolves with `viewport-fit=cover`.

- **No fixed/absolute element may sit in the inset zone.**
  Position transient overlays (toasts, callouts, banners) relative to the *safe content box*, never the raw viewport (`top: 0`, `bottom: 0`).
  *Why:* a viewport-anchored badge/callout lands under the camera and is unreadable.

- **Branch layout on aspect/orientation, never device width.**
  Switch arrangements on `orientation` / aspect ratio. No `@media (max-width: …)` for *sizing*.
  *Why:* width breakpoints + fixed pixels silently fall back to the wrong device class on the next form factor (e.g. a short landscape viewport gets tablet pixel sizes → primary content overflows, secondary UI drops below the fold).

- **The primary content element has sizing priority and is never clipped.**
  Size it to the constrained dimension of the safe box; let secondary panels take the remainder. Scrolling is a graceful last resort, not a layout strategy.

## 2. Sizing model

- **Derive responsive sizes in JS and write them to CSS custom properties; CSS only consumes them.**
  Measure the safe box, compute integer-pixel sizes, set them on `:root`. Keep static fallbacks in CSS for first paint only.
  *Why:* media-query pixel guesses don't track the safe box; sub-pixel distribution causes seams.

- **Never rely on browser intrinsic sizing for anything that toggles at runtime.**
  Anything whose layout changes on a state flip (orientation, theme, density) must be sized from explicit JS-derived values, **not** `min-content` / `max-content` / `auto` intrinsic tracks.
  *Why:* WebKit does not reliably recompute intrinsic track sizing across an `orientationchange`/attribute flip — an intrinsically-sized element collapses on the return trip. If a size matters across a state change, compute it and write it down; don't ask the engine to re-derive it.

- **Prefer explicit, stateless CSS over clever auto behaviour.**
  Anything stateful must fully reset *by construction*, not by hoping the engine re-derives it on the way back.

## 3. Touch & pointer

- **Bound every pointer/touch offset so screen-edge targets stay reachable.**
  A constant "lift the dragged thing above the finger" offset must not exceed the gap between the content edge and the screen edge.
  *Why:* once the content is flush with the safe-area edge, a large constant offset pushes the required finger position off-screen — the outermost row/column becomes impossible to hit.

- **Snap to the nearest valid target near edges.**
  When the resolved point lands within ~one cell/grid-unit *just outside* a content edge, snap to the nearest valid target; only return "no target" further out (so release-to-cancel still works).

- **Use Pointer Events**, `touch-action: none` on drag surfaces, and hit-test with `elementsFromPoint` — no manual rect/DPR math. Remember `pointer-events: none` elements are skipped by `elementFromPoint` (don't hit-test through your own overlay).

## 4. Platform media

- **Treat platform media as locked until proven otherwise.**
  Web Audio unlocks only from a *genuine user gesture of the right class* — a `click`/`pointerup` on a real control, **not** a drag — and must be (re)attempted **per page load**. Ship an explicit "tap to start" gate whose button click performs the unlock; bind unlock to several gesture types idempotently as a safety net. Assume nothing auto-plays.

## 5. Delivery & diagnosability

> A correct build the device never loads is indistinguishable from a broken build.

- **Ship a visible, build-tied version marker from day one.**
  A tiny on-screen identifier tied to your release id is the cheapest answer to "is the new code even running?" — without it every other debugging step is guesswork. It must out-stack *every* full-screen layer (gates, modals, overlays) via an explicit top z-index token and be `pointer-events: none`.

- **Know the service-worker update lifecycle.**
  `autoUpdate` (Workbox `skipWaiting` + `clientsClaim`) still does **not** refresh an already-open client until a reload, and an **iOS standalone PWA only checks/activates a new SW on a cold relaunch** (force-quit, sometimes twice; worst case remove and re-add to the home screen). Precaching is cache-first, so a bad deploy is sticky — keep `cleanupOutdatedCaches` on.

- **Document the user-facing "how to get the new version" steps** next to the deploy instructions — it is not discoverable.

- **Use a drift-proof version scheme.**
  Tie the marker to a monotonic release identifier; add a test that pins it to the source of truth so it cannot silently go stale.

## 6. Testing

- **Real-engine e2e (WebKit) is mandatory for layout, safe-area, touch, and intrinsic-sizing behaviour.**
  jsdom/unit tests cannot observe any of these — they are exactly where the expensive bugs live.

- **Reproduce in a real browser *before* fixing**, then keep the repro as a permanent regression test (e.g. an orientation round-trip; an edge-of-screen drop).

## 7. Pre-ship checklist

- [ ] `viewport-fit=cover`; all four content edges use `max(token, env(safe-area-inset-*))`, both orientations.
- [ ] No fixed element in the inset zone; overlays anchored to the safe content box.
- [ ] Layout branches on orientation/aspect, not width.
- [ ] Responsive sizes JS-derived to `:root`; nothing layout-critical relies on intrinsic sizing across a state toggle.
- [ ] Primary content never clipped; scroll only as last resort.
- [ ] Pointer offsets bounded; edges reachable; edge snap-to-nearest.
- [ ] Audio/media behind a real-gesture unlock gate; re-armed per load.
- [ ] Visible build marker, top-stacked, `pointer-events:none`, drift-pinned by a test.
- [ ] SW update path understood; user-facing refresh steps documented.
- [ ] WebKit e2e covering orientation round-trip + edge drag; regression repros kept.
