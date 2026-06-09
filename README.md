# Ideas Visualized

A showcase site for the bespoke, music-synced visual effects built across our
projects — hand-rolled with Canvas 2D and Web Audio, no off-the-shelf engine.

Inspiration: [wawa-vfx](https://github.com/wass08/wawa-vfx) /
[live demo](https://wawa-vfx.wawasensei.dev/#emitter) — stepped up with our own
audio-reactive engines, game effects, and a "how we built it" research layer.

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS v4
- Framer Motion
- Client-side Canvas 2D / Web Audio effects

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Structure

```
app/                     Routes: / (home), /gallery, /gallery/[slug],
                         /experiences, /research
components/effects/      Self-contained effect modules (one folder per effect)
components/              EffectDetail, EffectCard, EffectStage, ControlField
lib/effects/             Effect type contract + registry
docs/                    EFFECTS_CATALOG.md (full inventory), PLAN.md (roadmap)
```

## Adding an effect

1. Create `components/effects/<slug>/index.tsx` exporting an `EffectModule`
   (see `lib/effects/types.ts`). The `Component` receives `params` from the
   declared `controls`.
2. Register it in `lib/effects/registry.ts`.

The gallery, detail page, and live controls are generated automatically.

## Roadmap

See [`docs/PLAN.md`](docs/PLAN.md). Currently in **Phase 0** — foundation +
three proof effects (cursor attractor, matrix rain, ambient particle network).
The full effect inventory is in [`docs/EFFECTS_CATALOG.md`](docs/EFFECTS_CATALOG.md).
