# Ideas Visualized

**An interactive showcase of 57 bespoke visual effects** — Canvas 2D, pseudo-3D, and true WebGL — each one live, controllable, randomizable, and exportable.

🔗 **Live demo: [ideas-visualized.vercel.app](https://ideas-visualized.vercel.app)**

Inspired by [wawa-vfx](https://github.com/wass08/wawa-vfx), but stepped up: instead of a single page of generic R3F particle tiles, every effect here is a hand-rolled, parameterized module with live controls, curated presets, a one-click "🎲 surprise me," and **code export** (an AI prompt *or* a ready-to-paste React component).

---

## What's inside

- **57 effects** across three rendering tiers:
  - **Canvas 2D** — particle systems, cursor trails, fireworks, lightning, ripples, auroras, networks, charge-up bursts, and more.
  - **Pseudo-3D** — wireframe cubes, chain detonations, and a CSS depth tunnel.
  - **True WebGL** (React Three Fiber) — galaxy spiral, nebula cloud, particle morph, vortex tree, crystal core, torus knot, DNA helix, hyperdrive starfield, wave-grid terrain. All with **orbit / scroll-to-zoom / pan** camera control and bloom.
- **Live controls** per effect — sliders, toggles, selects, color pickers, and text inputs, with conditional visibility.
- **Unified color system** — every effect supports Single / Dual / Rainbow palette modes.
- **Curated presets** — hand-tuned looks for each effect.
- **Randomize** — per-effect 🎲 button (or press `R`), plus a global "Surprise me" that jumps to a random effect with random parameters.
- **Export** — generate an AI prompt to recreate the visual, or copy a self-contained React component.
- **Expand / fullscreen** any effect for presentation.
- **Experiences** — playable demos, including a **Simon Says** memory game driven by the custom "absorption cursor."
- **Research** — write-ups on the techniques behind the effects (reactive-effects best practices, object pooling, ghosting/burn-in fixes).

## Built for performance

- **No ghosting by default** — a crisp `clearMode: "full"` harness; motion trails are drawn explicitly rather than via accumulating fades (which asymptote due to 8-bit rounding).
- **Object pooling** — particle-heavy effects reuse instances instead of allocating/garbage-collecting per frame.
- **Off-screen pause** — `IntersectionObserver` halts the render loop when an effect scrolls out of view; tab-visibility aware.
- **DPR-capped + delta-timed** — sharp on retina, frame-rate-independent motion.
- **Reduced-motion aware** — respects `prefers-reduced-motion`.

## Tech stack

- [Next.js](https://nextjs.org/) (App Router) + TypeScript
- Tailwind CSS
- Canvas 2D + Web Audio for 2D/audio-reactive effects
- [React Three Fiber](https://github.com/pmndrs/react-three-fiber) + [drei](https://github.com/pmndrs/drei) + [postprocessing](https://github.com/pmndrs/react-postprocessing) for true 3D

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build    # production build
npm start        # serve the production build
```

## Project structure

```
app/                     Routes (gallery, gallery/[slug], experiences, research)
components/
  effects/<slug>/        One self-contained module per effect
  effects/useCanvas2D.ts The shared Canvas 2D harness (clear policy, DPR, pointer, pause)
  effects/three/Stage3D  The shared R3F scaffold (orbit/zoom/pan + bloom)
  EffectDetail.tsx       Interactive view: controls, presets, randomize, export, fullscreen
lib/effects/
  meta.ts                Server-safe metadata (slug, controls, presets) for every effect
  registry.tsx           Slug → React component map (client)
  color.ts               Single / Dual / Rainbow palette helpers
docs/                    Catalog, plan, and research notes
```

### Adding an effect

1. Create `components/effects/<slug>/index.tsx` exporting a named component `({ params }) => ...`.
2. Add an `EffectMeta` entry (slug, controls, presets) to `lib/effects/meta.ts`.
3. Register the component by slug in `components/effects/registry.tsx`.

That's it — the gallery, detail page, controls, presets, randomize, and export all wire up automatically.

## License

[MIT](./LICENSE) © Idea-R
