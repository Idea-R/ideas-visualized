<div align="center">

# Ideas Visualized

### Effects that make people ask *"how did they build that?"*

**57 interactive visual effects across three render tiers: Canvas 2D, pseudo-3D, and true WebGL. Every one is live-controllable, randomizable, and exportable.**

[![Live Demo](https://img.shields.io/badge/Live_Demo-ideas--visualized.vercel.app-7c5cff?style=for-the-badge)](https://ideas-visualized.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-18e0d8?style=for-the-badge)](./LICENSE)

![Next.js](https://img.shields.io/badge/Next.js-000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?logo=typescript&logoColor=white)
![React Three Fiber](https://img.shields.io/badge/React_Three_Fiber-black?logo=three.js&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-0b1120?logo=tailwindcss&logoColor=38bdf8)
![Deployed on Vercel](https://img.shields.io/badge/Vercel-deployed-000?logo=vercel&logoColor=white)

[**Open the live demo →**](https://ideas-visualized.vercel.app)

![Ideas Visualized landing](docs/screenshots/landing.png)

</div>

---

## Why this exists

Inspired by [wawa-vfx](https://github.com/wass08/wawa-vfx). Instead of a single page of R3F particle tiles, every effect here is a hand-written, parameterized module with:

- Live controls: sliders, toggles, selects, color pickers, and text inputs, with conditional visibility.
- Single, Dual, and Rainbow color modes on one shared palette system.
- Curated presets and a randomize button (or press `R`), plus a global "Surprise me."
- Code export: generate an AI prompt that recreates the look, or copy a self-contained React component.
- Expand any effect to fullscreen.

There is no off-the-shelf engine. The work is in the hand-written particle physics, object pooling, culling, and audio-to-visual mapping.

## The gallery

![Gallery](docs/screenshots/gallery.png)

### 57 effects across three render tiers

| Tier | Examples |
|---|---|
| **Canvas 2D** | Particle Constellation · Nova Burst · Aurora Veil · Nexus Card · Charge Burst · Matrix Rain · Lightning · Corner Fireworks · Absorption Cursor · Ripple Distortion |
| **Pseudo-3D** | Wireframe Cubes · Chain Detonation · Depth Tunnel |
| **True WebGL** (R3F) | Galaxy Spiral · Nebula Cloud · Particle Morph · Vortex Tree · Crystal Core · Torus Knot · DNA Helix · Hyperdrive · Wave Grid |

All WebGL scenes support **orbit / scroll-to-zoom / pan** camera control with bloom.

<div align="center">

![Galaxy Spiral, a true WebGL scene](docs/screenshots/galaxy.png)

</div>

## Built for performance

- No ghosting by default. The harness uses a crisp `clearMode: "full"`, and motion trails are drawn explicitly instead of by accumulating fades (those never fully clear because of 8-bit rounding).
- Object pooling: particle-heavy effects reuse instances instead of allocating and garbage-collecting every frame.
- Off-screen pause: an `IntersectionObserver` stops the render loop when an effect scrolls out of view, and it also pauses on tab switches.
- DPR-capped and delta-timed: sharp on retina displays, with motion that stays frame-rate independent.
- Reduced-motion aware: it respects `prefers-reduced-motion`.

## Beyond the gallery

- Experiences: Simon Says, a memory game driven by the custom absorption cursor, and Ideas in Motion, a scroll-driven parallax journey.
- Research: write-ups on the techniques, including how to fix canvas ghosting, when to pool objects, and how to keep particle-heavy scenes fast.

## Tech stack

[Next.js](https://nextjs.org/) (App Router) · TypeScript · Tailwind CSS · Canvas 2D + Web Audio · [React Three Fiber](https://github.com/pmndrs/react-three-fiber) + [drei](https://github.com/pmndrs/drei) + [postprocessing](https://github.com/pmndrs/react-postprocessing)

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Project structure

```
app/                     Routes (gallery, gallery/[slug], experiences, research)
components/
  effects/<slug>/        One self-contained module per effect
  effects/useCanvas2D.ts Shared Canvas 2D harness (clear policy, DPR, pointer, pause)
  effects/three/Stage3D  Shared R3F scaffold (orbit/zoom/pan + bloom)
  EffectDetail.tsx       Interactive view: controls, presets, randomize, export, fullscreen
lib/effects/
  meta.ts                Server-safe metadata (slug, controls, presets) for every effect
  registry.tsx           Slug → React component map (client)
  color.ts               Single / Dual / Rainbow palette helpers
docs/                    Catalog, plan, roadmap, research notes
```

### Adding an effect

1. Create `components/effects/<slug>/index.tsx` exporting a named component `({ params }) => ...`.
2. Add an `EffectMeta` entry (slug, controls, presets) to `lib/effects/meta.ts`.
3. Register the component by slug in `components/effects/registry.tsx`.

The gallery, detail page, controls, presets, randomize, and export all wire up automatically.

## Connect

Built by [Ideas Realized](https://ideas-realized.com). If this helped or gave you ideas, a star on the repo is appreciated.

- Main site: [ideas-realized.com](https://ideas-realized.com)
- LinkedIn: [in/ideasrealized](https://www.linkedin.com/in/ideasrealized)
- X: [@xentrilo](https://x.com/xentrilo)

## License

[MIT](./LICENSE) © Idea-R
