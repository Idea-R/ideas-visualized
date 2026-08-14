# Ideas Visualized — Roadmap

Where we are and where we're going. The north star: a **credibility / star-power
showcase** for our repos — a site that, when shared, instantly reads as legit and
"how did they build that?" impressive.

## Status (August 2026)
- 89 interactive effects (Canvas 2D · pseudo-3D · true WebGL/R3F) with live
  controls, Single/Dual/Rainbow color modes, curated presets, randomize (+`R`),
  global "Surprise me," code export (AI prompt + React component), expand/fullscreen.
- Shared harnesses: `useCanvas2D` (crisp clear, DPR, pointer, off-screen pause) and
  `Stage3D` (orbit / scroll-zoom / pan + bloom).
- Game Assets with combat, spells, impacts, weather, traps, and a live **Spell Duel** showcase.
- Experiences: **Simon Says** (absorption-cursor game) + **Ideas in Motion** (scroll experience).
- Research docs; MIT license; canonical site at `ideasvisualized.com`; GitHub repo `Idea-R/ideas-visualized`.
- Canonical metadata, crawler policy, sitemap, and a repeatable `npm run check` quality gate.

---

## Phase 1 — Presentation & credibility  ⭐ (highest leverage, do first)
The site works; now make it *land*.

1. **Landing page glow-up**
   - Full-bleed live signature effect behind the hero (curated marquee effect, not the first registry entry).
   - Sharp headline + value prop, primary/secondary CTAs.
   - Stats band derived from the effect registry so releases cannot leave the count stale.
   - "Why this beats the inspiration" / feature highlights row.
   - Curated featured-effects grid (the flashiest, hand-picked).
   - Render-tier section (2D / pseudo-3D / WebGL) + Experiences + Research teasers.
   - Polished footer with repo + live links.
2. **Epic README** (public GitHub face)
   - Hero banner, badges (license, stack, deploy, live demo), one-line pitch.
   - Animated GIF / screenshot strip of marquee effects.
   - Categorized effect table, feature tour, perf notes, architecture, "add an effect," contributing, license.
3. **Social / OG + SEO**
   - [x] Canonical metadata, `sitemap.ts`, and `robots.ts`.
   - [x] Branded `opengraph-image` and `twitter-image` generated via `next/og`.
   - [x] Per-effect titles, descriptions, and canonical URLs.
   - [ ] Optional per-effect visual OG cards.

## Phase 2 — Marquee content
4. **Port ONE real music-synced Experience** (the biggest differentiator vs wawa-vfx).
   - Pick the lightest-to-extract show; use a shared neutral demo track or free-run mode.
   - Poster + "open full experience" + notes on the engine.
5. **Second mini-game tied to an effect**
   - e.g. a reaction/dodge game on the absorption cursor, or a "pop the nodes" on nexus.

## Phase 3 — More effects (next batch)
Candidate ports/new builds (pick ~5 per batch):
- Shader/WebGL image-ripple distortion (from `visual-scroll-ideas`).
- Text-particle formation ("words assemble from particles").
- Fluid/metaballs, fireflies, lightning web, kaleidoscope, tunnel-fly 3D, terrain fly-through.

## Phase 4 — Quality & polish
6. **Global "calm mode"** reduced-motion toggle in the nav (persisted).
7. **Performance**: code-split/lazy-load R3F effects, defer offscreen mounts, Lighthouse pass.
8. **Accessibility**: focus states, keyboard nav for the gallery, aria labels, color-contrast check.

## Phase 5 — Growth & distribution
9. **Custom domain**: complete at `ideasvisualized.com`; monitor the legacy Vercel hostname as a secondary origin.
10. **"Embed this effect"**: iframe route + copy-embed snippet.
11. Analytics, sitemap submission, a `CONTRIBUTING.md`, issue/PR templates.

---

### Working agreement
- Build effects in parallel via subagents on the established contracts; integrate
  `meta.ts` + `registry.tsx` centrally to avoid conflicts.
- Verify every batch: `tsc` + `next build` + lint + headless-Chrome screenshots + live 200s.
- Commit in focused units; deployment remains a separate, explicitly reviewed step.
