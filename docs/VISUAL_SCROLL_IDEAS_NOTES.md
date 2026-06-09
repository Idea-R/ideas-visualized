# Research Notes — `Idea-R/visual-scroll-ideas`

Captured notes from the GitHub repo for future porting. **Not yet ported** — this is a reference
catalog only. The repo is a Lovable-built **Vite + React + TypeScript + shadcn-ui + Tailwind**
single-page *scroll showcase* (different shape from our controllable per-effect gallery), with a
Supabase integration.

> 📁 **Cloned locally for reference:** `C:\dev\visual-scroll-ideas` (shallow clone, branch `main`).
> Read source directly from there, e.g. the effect files under
> `C:\dev\visual-scroll-ideas\src\components\` and `…\src\components\sections\`.
> Quick map of the high-value files:
> - `src/components/BlackHoleLoader.tsx` — black-hole loader
> - `src/components/sections/ImageDistortionSection.tsx` + `WebGLCanvasSection.tsx` — WebGL distortion
> - `src/components/sections/ParallaxLayersSection.tsx` — big multi-layer parallax
> - `CHRISTMAS_TREE_VORTEX.md` — full standalone vortex-tree code (see below)

> ⚠️ **Security:** the repo has a committed `.env` (likely Supabase keys). Rotate those keys and
> add `.env` to `.gitignore` on the remote. We did not read or copy its contents. (It's present in
> the local clone too — don't commit it anywhere.)

---

## Why this repo matters

Most of it is **scroll-driven choreography** (parallax, horizontal/zoom/diagonal scroll) rather than
standalone interactive effects. But a few pieces are strong standalone gems, and one — the
**Christmas Tree Vortex** — is the direct origin of our "galaxy particles as 3D wireframe shapes"
upgrade. We already have the geometric-shape building blocks (instanced wireframe icosa/octa/tetra),
plus the "asset cards with the nexus effect" that people like.

---

## Effect inventory

### Standalone components (`src/components/`)
| Component | Notes | Port value |
|---|---|---|
| `BlackHoleLoader.tsx` (17KB) | Black-hole loader: accretion + gravitational pull of particles. | **High** — clean standalone gallery effect candidate. |
| `FlipCard.tsx` / `sections/FlipCardGallery.tsx` | 3D flip cards. | Med — we already have `tilt-card`; could extend with a flip variant. |
| `TypewriterCode.tsx` | Typewriter code reveal. | Low/Med — fits a "code" themed tile. |
| `NoiseOverlay.tsx` | Tiny film-grain/noise overlay. | Low — useful as a global polish layer, not a tile. |

### Scroll sections (`src/components/sections/`)
| Section | What it does | Port value |
|---|---|---|
| `ParallaxLayersSection.tsx` (33KB) | Big multi-layer parallax depth scene. | High *as a "Scroll Experience" page*, not a gallery tile. |
| `HorizontalScrollGallery.tsx` | Horizontal scroll-jacking gallery. | Med — scroll experience. |
| `ZoomScrollSection.tsx` | Zoom-on-scroll. | Med — ties into our zoom theme. |
| `DiagonalZigzagSection.tsx` (21KB) / `DiagonalCard.tsx` | Diagonal zig-zag scroll reveals. | Med — scroll experience. |
| `ImageDistortionSection.tsx` (12KB) | Scroll-driven image distortion (WebGL-ish). | **High** — a ripple/displacement distortion effect is portable & cool. |
| `WebGLCanvasSection.tsx` (10KB) | A WebGL canvas section. | Med/High — mine for a shader/distortion effect. |
| `NoiseTextureSection.tsx` (18KB) | Animated noise texture field. | Med. |
| `CombinedScrollSection.tsx` | Combo scroll demo. | Low (composite). |
| `HeroSection.tsx` / `ContactFooter.tsx` | Page chrome. | N/A. |

---

## ⭐ Christmas Tree Vortex (`CHRISTMAS_TREE_VORTEX.md`)

The origin of our galaxy "wireframe shapes" idea. A festive R3F scene; **fully documented standalone
code** lives in that file (drop-in `VortexGeometricShapes`, `StarTopper`, `TwinklingLights`,
`SnowParticles`). Key techniques worth reusing:

- **Geometry:** three `InstancedMesh` types — `icosahedronGeometry`, `octahedronGeometry`,
  `tetrahedronGeometry` — 150 each (~450 shapes), `meshBasicMaterial` with `wireframe`,
  `AdditiveBlending`, `depthWrite={false}`, `frustumCulled={false}`. (This is exactly the instanced
  wireframe-shape approach we now use in `galaxy-spiral`.)
- **Vortex layout (funnel/tree):** for each shape, `t = (i % count) / count`;
  - `y = 15 - (t + layerOffset*0.1) * 50` (descends top→bottom),
  - `baseRadius = 0.5 + t*14 + rand*2` (widens downward → cone/tree silhouette),
  - `angle = t*π*10 + rand*π*0.8 + layerOffset*π*2` (spiral),
  - per-frame: `currentAngle = baseAngle + time * rotationSpeed`, position from
    `(radius*cos, y, radius*sin)`, plus per-shape Euler rotation + sine scale pulse.
- **Scroll hook:** a `scrollProgress` prop contracts the radius (`contractFactor = 1 - progress*0.6`)
  so the vortex tightens as you scroll (GSAP ScrollTrigger in their version).
- **Color:** per-mesh HSL gradient by depth (`colorT`); festive palette maps cyan/magenta/lime →
  forest-green / christmas-red / gold.
- **Star topper:** dodecahedron + additive glow sphere + bright core, slow rotate + bob + pulse.
- **Twinkling lights:** instanced spheres on a spiral, per-light `twinkleSpeed/offset`, random "off"
  moments (`sin(time*0.5 + i*1.7) > 0.95`), brightness drives scale + `color.multiplyScalar`.
- **Snow:** `Points` cloud falling with gentle `sin` sway, recycle when `y < -15`.
- **Perf tips:** halve shape count on mobile; `frustumCulled={false}` to avoid popping; update twinkle
  every other frame; add `@react-three/postprocessing` bloom on star/lights (we already have bloom in
  `Stage3D`).

> Their stack pins R3F v8/three 0.160 for React 18. We're on **R3F 9 / three 0.184 / React 19** with a
> shared `Stage3D` (orbit + zoom + bloom) — so a port would reuse our scaffold + `readPalette`/`paletteColor`
> and our instancing pattern from `galaxy-spiral`, not their Canvas/GSAP wiring.

### Port idea: "Vortex Tree" gallery effect
A true-3D `vortex-tree` effect on `Stage3D`: instanced wireframe icosa/octa/tetra in the funnel layout,
controls for `count`, `spin`, `taper` (cone tightness), `twist`, `contract` (radius pinch), optional
star topper + twinkling lights toggles, standard color block. Reuses bloom + orbit/zoom for free.

---

## Related things we already have
- **Geometric shapes:** `wireframe-cubes`, `crystal-core`, `galaxy-spiral` (now with wireframe
  cube/octa/tetra/icosa particle modes), `geometric-bomb`.
- **"Asset cards w/ nexus effect"** (liked by users) — note to revisit/showcase these; confirm whether
  a matching card effect exists in our gallery or should be ported next.

## Suggested next ports (when ready)
1. **Vortex Tree** (from the Christmas doc) — highest synergy with current scaffold.
2. **Black Hole** loader → standalone effect.
3. **Image/ripple distortion** (from `ImageDistortionSection`/`WebGLCanvasSection`).
4. **"Scroll Experiences" page** for the parallax/horizontal/zoom/diagonal sections (separate from the
   controllable gallery).
