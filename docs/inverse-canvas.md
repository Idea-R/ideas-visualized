# Inverse Canvas playground

Implemented in Ideas Visualized on 2026-09-11. Publication approved on 2026-09-12. Production target: `https://ideas-visualized.vercel.app/page-transitions`.

## Open

- `/page-transitions`: the new gallery section, also linked from the main Gallery.
- `/gallery/inverse-canvas`: the approved AAU page-flip behavior with live controls.
- `/gallery/pixel-field`: a separate hover/tap tile field behind content.
- `public/experiments/inverse-canvas/inverse-canvas.zip`: portable demo, styles, reusable module, and integration README.

Controls cover target tile count, wave travel, tile flip, grid lead-in, origin, palette, and hover radius/intensity where applicable. AAU Original preserves the approved transition. Fine grain, Slow wave, and Coarse provide starting variations. Settings use the existing shareable URL system and can be downloaded as JSON. Reset restores the defaults.

The frame isolates the native page snapshots from the gallery's controls and navigation. There is no new dependency. Existing effect modules are unchanged. Inactive cards use static SVG posters, so browsing this section does not start animation loops or intercept card links.

## Preserved source

See [the source snapshot and hashes](references/underground-inverse-canvas/README.md). The original AAU project was not edited. The extraction preserves all 49 old/new frame masks at default settings for the tested 390×844, 720×600 and 1440×900 dimensions.

## Verification

- `npm run build`: passed, including the new routes and static effect/embed pages.
- `npx tsc --noEmit`: passed.
- `npm run test:transitions`: 3 passing tests, including exact source-frame parity and bounded settings.
- Browser regression against the production preview: 1366×900 and 390×844. Passed gallery navigation, shell isolation, animated light/dark flips, live presets without reload, increased density, Escape, capture failure, JSON/ZIP downloads, fullscreen, reduced motion, unsupported API fallback, hover pulses, and offscreen cleanup. No uncaught browser errors.
- Screenshots inspected: gallery, mid-flip desktop, completed dark desktop/mobile, and hover demo. Evidence is in ignored `.playwright-mcp/inverse-canvas/`.

Review used a local production preview on `http://127.0.0.1:4186/page-transitions`, started with `npm run start -- --port 4186 --hostname 127.0.0.1`. The temporary dev server was stopped. For `npm run dev`, use the advertised `localhost` origin: this Next version blocks a mismatched dev-resource origin, which can prevent hydration. No origin policy was weakened.

### Repeat the browser checks

The browser script uses an existing Playwright install. No test dependency was installed into this repo. On this workstation:

```powershell
$env:IV_PLAYWRIGHT_PATH = 'C:/dev/IdeasRealized/Projects/AIOutfitters/node_modules/playwright'
$env:IV_PREVIEW_URL = 'http://127.0.0.1:4186'
npm run test:transitions:browser
```

On another host, point `IV_PLAYWRIGHT_PATH` at that host's Playwright package (or install it locally and omit the variable). Browser checks close their own browser process. Repackage after editing the portable source with `powershell -NoProfile -File scripts/package-inverse-canvas.ps1`.

## Boundaries

The page flip uses native same-document View Transitions and perspective masks, not a true 3D cube mesh. Reduced-motion users and browsers without that API get an immediate switch. High-density performance has not been profiled on physical low-end phones. No claim of cross-browser animation parity is made; native API availability and snapshot content limitations still apply. The hover field is deliberately independent of theme switching.
