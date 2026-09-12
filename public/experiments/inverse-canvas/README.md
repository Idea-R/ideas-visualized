# Inverse Canvas

The approved AI Agency Underground dark-mode transition, extracted into a portable playground. Pixel Field is a separate hover-background variation. Neither changes the Underground site or the Ideas Visualized shell.

## Run

Serve this folder over HTTP (for example `npx serve .`) and open `index.html`. Add `?mode=hover` for Pixel Field. No build step or runtime dependencies. JavaScript modules need HTTP, not a double-clicked file URL.

## Reuse the page transition

Include `transition.css`, then import `inverseTransition` from `engine.mjs`:

```js
import { inverseTransition, DEFAULTS } from './engine.mjs';

const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
const job = inverseTransition(document, {
  origin: { x: event.clientX, y: event.clientY },
  params: DEFAULTS,
  apply: () => { document.documentElement.dataset.theme = nextTheme; },
  onState: busy => { button.disabled = busy; },
});
await job.finished;
// job.cancel() settles on the requested theme without waiting for the animation.
```

For keyboard activation, use the trigger's center instead of event coordinates. The update callback must be idempotent. Keep any destination palette, persistence, routing, and focus restoration in the host app. This is a same-document effect: route changes must update the current document. It is not a cross-origin navigation transition.

Native before/after snapshots carry real text and images through staggered perspective masks. This is a 2D tile-flip illusion, not physical 3D cube geometry. In the gallery it runs inside an iframe so the effect does not capture the controls or navigation.

## Controls

| Setting | Approved default | Allowed range |
| --- | --- | --- |
| Target tile count | 520 | 120–1,600 |
| Wave travel | 820 ms | 200–1,800 ms |
| Tile flip | 490 ms | 200–1,200 ms |
| Grid lead-in | 280 ms | 0–700 ms |
| Origin | Pointer | Pointer, center, upper-right corner |
| Palette | Teal | Teal, violet, amber |
| Hover radius | 180 px | 80–320 px |
| Hover intensity | 0.35 | 0.1–0.8 |

Default full flip: 1,650 ms plus 280 ms lead-in. Density is a target, not an exact count: aspect ratio and the minimum cell size affect the final grid. The 32 px cell floor scales with density. The default geometry and timing match the approved source; higher density is an experiment, not a mobile performance guarantee.

The stage accepts same-origin parent messages `{type:'inverse-canvas:params', params:{...}}` and `{type:'inverse-canvas:active', active:false}`. It sends `{type:'inverse-canvas:ready'}` when ready. The parent must verify message source and origin. Settings are sanitized and do not reload the frame. Gallery settings can be downloaded separately as JSON. To use them standalone, pass them to `settings()` in `stage.mjs` in place of `DEFAULTS`.

## Safeguards

- Reduced motion or unsupported View Transitions: immediate theme change.
- Escape, resize, scrolling, hidden tab, or interrupted capture: settle and release controls.
- Repeated activation shares the active job rather than overlapping snapshots.
- No screenshot library, DOM duplication, tracking, storage, or external assets.
- Hover animation clears every frame, runs only for live pulses, caps DPR at 2, and pauses offscreen via the gallery wrapper.

For named View Transition elements in a host app, remove those names or adapt the masks to them; this module animates the root snapshot. Test embedded video, browser support, and navigation separately before using it on another production site.

## Provenance

Original: `AIOutfitters/sites/agency-underground/public/theme.js` and `theme-transition.css`. An exact source snapshot and SHA-256 manifest are saved under `docs/references/underground-inverse-canvas/` in the Ideas Visualized repo. Only the reusable masks and transition behavior were extracted. The website's copy, palette rules, and approved animation source were left untouched.

API reference: https://developer.chrome.com/docs/web-platform/view-transitions/same-document
