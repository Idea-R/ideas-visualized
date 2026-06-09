# Ideas Visualized — Effects Catalog

A consolidated inventory of every notable visual effect found across the source
projects, with file paths, tech, and reuse potential. This is the raw material
for the **Ideas Visualized** showcase site.

> Source projects scanned: `AllRoadsLeadToCursor`, `allroadsleadtolovable`,
> `1shotCRM`, `aVOID`. (More may be added later.)

---

## The through-line (why this is a credibility play)

Every project is built on **hand-rolled Canvas 2D + Web Audio**, not an
off-the-shelf engine. Three of the four are **music-synced narrative
"experiences"** driven by audio analysis + a song timeline; the fourth (`aVOID`)
is a set of **game-grade interactive effects** (cursor trails, particle bursts,
lightning, screen shake, chain detonations).

This is a different, arguably stronger story than the inspiration
([wawa-vfx](https://github.com/wass08/wawa-vfx)): wawa-vfx is a generic R3F
particle library; these are **bespoke, music-reactive, from-scratch VFX
engines**. Almost no GLSL / Three.js (one small R3F cube). The craft is in the
hand-written particle physics, object pooling, culling, and audio→visual
mapping.

**Tech summary across all four:** Next.js / Vite + React, Canvas 2D API,
`requestAnimationFrame`, Web Audio (`AnalyserNode` live + precomputed offline
analysis), Framer Motion (UI), Tailwind/CSS keyframes. **Not present:** GLSL,
GSAP, Lottie, scroll-parallax, Phaser. One R3F/Three.js cube only.

---

## 1. AllRoadsLeadToCursor (the crown jewel)

**Canonical copy:** `C:\dev\AllRoadsLeadToCursor\ARLTC\allroadsleadtocursor\`
(everything else is older/partial duplicates; `AllRoadsLeadToCursorV7` is empty).

### 1a. `intro-experience.tsx` — music-synced canvas engine (~5,400 lines)
4 layered canvases + `AnalyserNode`, driven by `audio.currentTime` with
hardcoded cue points, palette rotation, adaptive FPS, object pooling, culling.
Internal effect classes (extract individually):

| Class | Effect | Tech |
|-------|--------|------|
| Particle | Gravity + swirl attraction to cube center; trails | Canvas 2D physics |
| DeepStar | 6,000-pt pseudo-3D starfield parallax | Canvas 2D |
| DeflectionRays / SpiralSweepRays | Radial wobbly / rotating sweep rays | Canvas 2D `lighter` |
| ShapePulse | Expanding rose/lemniscate parametric curves | polar math |
| SpiralField | 3-arm Archimedean spiral, beat-pulsed | Canvas 2D + RMS |
| EdgeSeeker / OrbitalTracer | Edge-spawn seekers / inward orbital trails | Canvas 2D |
| Rail + RailBead | Sine-wave rails with hue-cycling beads | Canvas 2D |
| LightningBolt | Jagged bolts + sparks (click → cube) | Canvas 2D |
| ElectricalStorm/Shock | Radial shock bursts from click | Canvas 2D |
| SpiralComet | Edge comets spiral inward w/ trail | Canvas 2D |
| Rocket + GeometricShape | Multi-phase rockets → 3D-projected shapes | state machine |
| NovaBurst | Timed explosion (280 particles + 42 shapes) | song cue |
| FountainEmitter | Corner fountains, beat-driven | Canvas 2D + audio |
| TextParticle | Particles form "CURSOR" text at 4:28 | text rasterization |
| RenderBatch / ObjectPool / CullingManager | Perf infrastructure | optimization |

**Song cues:** 1:13 rays · 1:55 nova · 2:37 rings · 3:10–3:30 lull · 3:50 finale
· 4:28 "CURSOR" reveal.

### 1b. Self-contained gems (easy ports)
| File | Effect | Reusable |
|------|--------|----------|
| `components\matrix-effect.tsx` | Dual-layer matrix rain + mouse spotlight reveal | **Yes, drop-in** |
| `components\cursor-attractor.tsx` | Pointer particle bursts, gravity to center | **Yes** |
| `components\logo-cube.tsx` | R3F cube w/ syntax-highlighted code texture, beat pulse | **Yes** (only WebGL piece) |
| `components\pre-intro.tsx` | Mouse-repulsion grid + bass-reactive ocean + wireframe cubes | Partial |
| `components\tilting-card.tsx` | 3D perspective tilt w/ spring + glow | **Yes** |
| `components\wavy-text.tsx` | Per-letter spring stagger reveal | **Yes** |
| `components\animated-title.tsx` | Gradient title char entrance | **Yes** |
| `components\epilogue-typing.tsx` | Glitch/scramble typewriter | **Yes** |
| `components\approval-gate.tsx` | Scanline + sheen-sweep modal | **Yes** |
| `components\loading-screen.tsx` | Gradient progress + glow sweep | **Yes** |
| `lib\performance-config.ts` | YOLO vs Compatible VFX density config | **Yes** (pure config) |

### 1c. Unique to the repo fork (`...-repo\components\`)
- `audio-reactive-overlay.tsx` — lightweight beat overlay (peak detection → edge
  comets, staged effects at 60/120/180s). Listens to `cursor-global-audio` event.
- `story-intro.tsx` — 14-segment cinematic typewriter + floating particles.

### 1d. Research docs
- `allroadsleadtocursor-production\WARP.md` — frontend flow / architecture notes.
- Richest "our take" docs are **inline comments** in `intro-experience.tsx` and
  `performance-config.ts`. No standalone shader/technique writeups here.

---

## 2. allroadsleadtolovable (cleanest, most extractable engine)

**All canvas effects in one file:**
`C:\dev\allroadsleadtolovable\components\experience\visual-stage.tsx` (~1,190 lines).
16 well-isolated `draw*`/`create*` functions — the best extraction candidates.

| # | Effect | Reusable |
|---|--------|----------|
| 1 | Deep star field (pseudo-3D parallax) | Partial |
| 2 | Background gradient + radial wash | **Yes** |
| 3 | Converging "route" lanes (18 bezier paths → center) | Partial |
| 4 | Route particles (~430 traveling along lanes) | Partial |
| 5 | Energy waves (beat-triggered expanding rings) | **Yes** |
| 6 | Lightning bolts (edge → center, storm/finale) | **Yes** |
| 7 | Audio halo (6 frequency-band arcs orbiting center) | **Yes** |
| 8 | Pinwheel build ring (rotating radial spokes) | **Yes** |
| 9 | Builder strings (sine-wave lines) | **Yes** |
| 10 | Orbit heart shards | Partial |
| 11 | Center sparks (radial burst) | **Yes** |
| 12 | Finale bloom (rotating sunburst rays) | **Yes** |
| 13 | Confetti fanfare (rect/tri/ellipse w/ wind+gravity) | **Yes** |
| 14 | Floating music notes (♪/♫ rising) | **Yes** |
| 15 | Heart burst particles (`drawHeartPath` primitive) | **Yes** |
| 16 | Heart core / logo centerpiece (blur glow layers) | Partial |

**Audio-sync infra (reusable):**
- `lib\audio-analysis.ts` — samples precomputed frames (subBass…air, rms, beat, peak).
- `scripts\generate-audio-analysis.mjs` — offline ffmpeg PCM → Goertzel bands →
  beat/peak → JSON. **This is the key reusable pattern for music-synced effects.**
- `config\tracks.ts` — quality profiles (`particleScale`, `dprCap`, `glow`).
- `resolveCanvasDpr` — adaptive DPR/perf utility.

**CSS/UI:** cinema HUD auto-hide slide, glassmorphism panel, gradient progress,
**karaoke lyric token highlighting** (`lib\lyrics.ts` + `globals.css`).

**Research docs (`docs\research\`) — the documentation goldmine:**
| File | Summary |
|------|---------|
| `README.md` | Research hub index + working principles |
| `source-index.md` | Index of reference repos + external sources reviewed |
| `project-audit.md` | Audit of old Cursor app architecture + reusable patterns |
| `lovable-style-direction.md` | Brand tone / visual motifs |
| `visual-effects-inventory.md` | Cursor→Lovable effect translation plan |
| `legacy-cursor-effects-catalog.md` | **Full 28-effect catalog** |
| `music-reactive-effects.md` | Audio analysis arch, beat detection, band→effect maps |
| `lyrics-visual-audio-audit.md` | Lyric/visual density + audio tuning notes |
| `performance-architecture.md` | Quality modes, particle budgets, layered canvas |
| `new-version-plan.md` | v1 scope + phased build plan |
| `champions-roll-call-timeline.md` | Section-by-section visual intent map |

---

## 3. 1shotCRM ("Take a Break" audio-visual showcase)

**Showcase:** `C:\dev\1shotCRM\components\AudioCanvasMode.tsx` (~2,255 lines).
Canvas 2D + live `AnalyserNode` (fftSize 512) + Framer Motion. Song-section
timeline (vocal 0:26 → finale 3:50+).

**Standout effects:**
- **Pseudo-3D rotating cube** (center + a cursor-following cube) — self-contained
  3×3 rotation-matrix math. **Reusable.**
- **Flowing sine lines** — multi-layer, treble + tempo scaled. **Strong showcase.**
- **Borg geometric click effect** — 12-segment expanding hexagonal grid on click. **Unique.**
- Click explosions (30-particle burst), beat waves, pulsating shaped rings
  (circle/wavy/star/hex), rotating mid-freq orbs, finale cube-splitting crescendo,
  confetti, music-note mouse trail.

**Drop-in components:**
- `components\InteractiveCanvas.tsx` — ambient particle network w/ mouse
  repulsion + proximity connection lines (mounted globally). **Yes, drop-in.**
- `components\CookieConsent.tsx` — 80-particle converging entrance burst. **Yes.**
- `components\audio-visualization\GlitchyText.tsx` — glitch→typewriter w/ RGB split. **Yes.**
- `components\audio-visualization\EndModal.tsx`, `AudioControls.tsx`, `EffectTypes.ts`,
  `hooks\useAudioLoader.ts` — partial refactor already extracted (not yet wired).

**Research docs (`documents\`):**
- `enhancement-music-note-flow.md` — pending feature spec.
- `refactoring-plan-audio-canvas-mode.md` — decomposition plan into hooks/renderers.
- `refactoring-progress-summary.md`, `refactoring-status.md`,
  `project-health-review-2025-01-09.md`.

---

## 4. aVOID (game / click-effects trove)

Monorepo: `apps\game-hub`, `games\void-avoid`, `games\word-avoid`,
`games\wreck-avoid`, `packages\shared`. (`tank-avoid` has no source.)

**Click / cursor effects (your "cool click effects"):**
- `apps\game-hub\src\components\CustomCursor.tsx` (+ `index.css`) — glowing dot +
  12-point fading trail, hover scale/color. **Drop-in.**
- `games\void-avoid\src\game\systems\CursorSystem.ts` (+ cursor CSS) — proximity
  **"absorption" cursor**: glow scales near `[data-cursor-hover]` targets,
  shrink/absorb + pulsing rings. **Unique.**
- `games\void-avoid\src\components\ColorWheel.tsx` — canvas HSL color picker. **Yes.**

**Particle / explosion / lightning toolkits (Canvas 2D, mostly self-contained):**
- `games\wreck-avoid\src\game\renderers\EffectsRenderer.ts` — grid bg, rarity
  glow, multi-ring explosions, dashed shockwave, jagged lightning. **Yes.**
- `games\wreck-avoid\src\game\ParticleSystem.ts` — pooled explosions, lightning
  path sparks, electric balls. **Yes.**
- `games\void-avoid\src\game\systems\particles\*` — object-pooled core with
  custom behaviors (energyAbsorption, shockwavePulse, expandingRing), standard
  effects, **chain detonation** (ripple waves, bezier arcs, mega-burst finale).
- `games\word-avoid\src\components\game\ParticleSystem.tsx` — Framer Motion word
  explosion + typing trail + 30 ambient orbs.

**Screen shake:** Framer (`word-avoid\App.tsx`) and canvas-translate
(`void-avoid\GameStateManager.ts`).

**UI / glow showpieces:**
- `games\word-avoid\src\components\ui\NeonButton.tsx` — pulsing gradient glow,
  spring hover/tap. **Great showcase button.**
- `games\void-avoid\src\components\CyberpunkScoreDisplay.tsx` — digit count-up,
  glitch on +50, circuitFlow/scanlines/shimmer. **Strong.**
- `games\word-avoid\src\components\game\GameArena.tsx` — full ambient scene
  (SVG grid, floating squares, rotating rings, pulsing crosshair). **Yes.**

**Research docs:** `games\word-avoid\docs\wordavoid_prd.md` (animation/particle
spec, <16ms frame budget), `typing_game_modes.md`, root `index.md`.

**Note:** aVOID has **no beat-synced visuals** (music-intensity scaffolding is
disabled). Its value is click/game effects, not audio sync.

---

## Showcase priority (what to feature first)

**Tier 1 — drop-in micro-effects (fastest, high impact):**
1. Matrix rain + spotlight (`AllRoads/matrix-effect.tsx`)
2. Cursor attractor / custom cursor trail (`AllRoads/cursor-attractor.tsx`, `aVOID/CustomCursor.tsx`)
3. Ambient particle network (`CRM/InteractiveCanvas.tsx`)
4. Glitch typewriter text (`CRM/GlitchyText.tsx`, `AllRoads/epilogue-typing.tsx`)
5. 3D tilt card (`AllRoads/tilting-card.tsx`)
6. Neon button + cyberpunk score HUD (`aVOID`)
7. Lightning / explosion / confetti toolkit (`aVOID/wreck-avoid`, `Lovable`)
8. Borg geometric click effect (`CRM`)
9. Absorption cursor (`aVOID/void-avoid/CursorSystem.ts`)

**Tier 2 — extractable audio-reactive primitives:**
- Energy waves, audio halo, pinwheel, finale bloom, heart burst (`Lovable/visual-stage.tsx`)
- Flowing sine lines, pulsating rings, pseudo-3D cube (`CRM/AudioCanvasMode.tsx`)
- Reusable offline audio-analysis pipeline (`Lovable/generate-audio-analysis.mjs`)

**Tier 3 — featured full "Experiences" (launch/embed, not tiles):**
- AllRoadsLeadToCursor intro (the flagship 5,400-line engine)
- Lovable "Champions Roll Call" experience
- 1shotCRM "Take a Break" showcase
- aVOID games (void-avoid, word-avoid, wreck-avoid)

---

## Gaps / not present (set expectations)
- No GLSL / WebGL shaders (one R3F cube only — no custom shaders).
- No GSAP, no Lottie, no scroll-driven parallax, no Phaser.
- "Beat sync" is hand-rolled RMS/threshold + song-timeline cues + precomputed
  band data — not a BPM-detection library.
