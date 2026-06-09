# Ideas Visualized — Site Architecture & Plan

A showcase site for the visual effects built across our projects. Inspiration:
[wawa-vfx](https://github.com/wass08/wawa-vfx) /
[live demo](https://wawa-vfx.wawasensei.dev/#emitter) — but stepped up.

## Goal

Build credibility ("star power") for our repos by showing off the bespoke,
music-synced, from-scratch VFX engines and game effects we've made. Where
wawa-vfx shows generic R3F particle tiles, we show **hand-rolled, audio-reactive,
narrative effects** with a "how we built it" research layer.

## How we beat the inspiration

| wawa-vfx | Ideas Visualized |
|----------|------------------|
| Single page of R3F tiles | Curated gallery + featured cinematic "Experiences" |
| Generic particle library | Bespoke music-synced engines, game effects |
| Leva sliders | Per-effect live controls + "view source" + tech badges |
| No narrative | "How we built it" research/credibility section |

## Stack (defaults — change anytime)

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS**
- Client-side Canvas 2D / Web Audio effects (matches source projects)
- Framer Motion for UI transitions
- Deploy target: Netlify (consistent with other repos)

## Information architecture

```
/                 Landing — hero with a live signature effect, value prop, nav
/gallery          Grid of interactive micro-effect panels (Tier 1 + 2)
/gallery/[slug]   Full-screen single effect with controls + source + notes
/experiences      Featured full music-synced shows + games (launch/embed)
/research         "How we built it" — surfaced research docs, techniques
```

## Effect registry pattern (the core abstraction)

Every effect is a self-contained module conforming to one interface so the
gallery can render, control, and document it uniformly.

```ts
// lib/effects/types.ts
export interface EffectControl {
  key: string;
  label: string;
  type: "range" | "color" | "toggle" | "select";
  min?: number; max?: number; step?: number;
  options?: { label: string; value: string }[];
  default: number | string | boolean;
}

export interface EffectModule {
  slug: string;                 // url + key
  title: string;
  blurb: string;                // 1-2 sentence description
  source: {
    project: string;            // e.g. "AllRoadsLeadToCursor"
    path: string;               // original file path for "view source"
  };
  tags: string[];               // ["Canvas 2D", "audio-reactive", "click", ...]
  tier: 1 | 2 | 3;
  controls?: EffectControl[];
  // Mounts the effect into a container; returns a cleanup fn.
  mount: (canvas: HTMLCanvasElement, opts: Record<string, unknown>) => () => void;
}
```

- Effects live in `components/effects/<slug>/` with an `index.ts` exporting an
  `EffectModule`.
- A registry (`lib/effects/registry.ts`) collects them; the gallery maps over it.
- Tier 1/2 = playable panels; Tier 3 = "Experience" cards that launch/iframe.

## Build phases

**Phase 0 — Foundation (this pass)**
- [x] Catalog (`docs/EFFECTS_CATALOG.md`)
- [x] This plan
- [ ] Scaffold Next.js app, Tailwind, base layout, dark VFX theme
- [ ] Effect registry + gallery shell
- [ ] 2–3 proof effects ported (matrix rain, cursor attractor, ambient particles)

**Phase 1 — Micro-effects gallery (Tier 1)**
- Port the drop-in effects: matrix rain, custom cursor trail, ambient particle
  net, glitch typewriter, tilt card, neon button, lightning/explosion/confetti,
  Borg click, absorption cursor.
- Each gets a panel with controls + source link + tech badges.

**Phase 2 — Audio-reactive primitives (Tier 2)**
- Port the offline audio-analysis pipeline (`generate-audio-analysis.mjs`).
- Energy waves, audio halo, pinwheel, finale bloom, flowing sine lines,
  pseudo-3D cube, pulsating rings — driven by a shared demo track.

**Phase 3 — Featured Experiences (Tier 3)**
- Launch/iframe the three music-synced shows + aVOID games.
- Poster art, short captions, "open full experience" buttons.

**Phase 4 — Research / credibility layer**
- Surface `legacy-cursor-effects-catalog.md`, `music-reactive-effects.md`,
  `performance-architecture.md` and our "own takes" as polished writeups.
- Link out to the repos for star power.

**Phase 5 — Polish & ship**
- Perf (DPR caps, pause off-screen via IntersectionObserver, reduced-motion
  support), Lighthouse, SEO/OG images, deploy.

## Open decisions (defaults chosen, easy to flip)

- Stack: **Next.js** (vs Vite/Astro).
- Experiences: **hybrid** — extract small effects, iframe/launch big shows.
- Location: `C:\dev\IdeasVisualized`.

## Notes / constraints

- No custom shaders exist; don't over-promise "WebGL shaders." Frame the story
  around **hand-rolled Canvas 2D + Web Audio craft**.
- Respect `prefers-reduced-motion`; provide a global "calm mode."
- Many source effects are coupled to song-specific timelines — extracted demos
  should use a shared neutral demo track or run in free-running (non-synced) mode.
