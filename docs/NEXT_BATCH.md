# Ideas Visualized — Next Batch Plan

Builds on the Phase 0 foundation (gallery + 3 proof effects). This batch makes
the effects **deeper to play with**, **shareable/exportable**, and **crisp +
fast by default**.

---

## Theme of this batch

1. **Richer, reversible controls** (toggles, attract↔repel, presets).
2. **Export the code and/or an AI prompt** for any effect + its current settings.
3. **Kill ghosting by default** in the shared harness.
4. **Adopt object pooling** for particle-heavy effects.
5. **Document the craft** (best-practices research doc — done) and surface it.

---

## Work item 1 — Control system expansion

### Current state
Controls support `range | color | toggle | select`. The detail page renders live
controls that drive the canvas. Good base; needs more expressive types + presets.

### Add
- **More toggles / reversible behaviors.** First-class examples:
  - Cursor Attractor: `mode` toggle **Attract ↔ Repel** (flip the force sign);
    `reverse` direction; emit-from-cursor vs emit-from-center.
  - Matrix Rain: invert spotlight (dim near cursor), reverse fall direction.
  - Ambient Network: attract vs repel cursor (already repels — make it switchable).
- **New control type: `vector2` / `xy-pad`** for directional fields (gravity
  direction, wind) — a small draggable pad.
- **New control type: `button`** for one-shot actions (e.g. "burst", "reset").
- **Per-effect presets.** A `presets: { name, params }[]` on each effect's meta;
  a dropdown to jump between curated looks (e.g. "Calm", "Storm", "Neon").
- **Randomize** button (respecting each control's min/max/options).
- **Shareable state via URL** (`?p=<encoded params>`), so a tweaked effect can be
  linked directly.

### Design
- Extend `EffectControl` with `vector2` / `button` types + optional `presets` on
  `EffectMeta`.
- Generalize `ControlField` to render the new types.
- Add a `useEffectParams(slug)` hook that owns params + URL sync + reset/randomize.
- Each effect reads new params (e.g. `mode === "repel" ? -1 : 1` force sign).

---

## Work item 2 — Export code and/or prompt

Goal: from any effect's detail page, a user can grab what they need to reuse it.

### Export modes
1. **Copy / download component code.** Emit a self-contained `.tsx` (effect +
   the `useCanvas2D` harness inlined) preset to the *current* control values.
2. **Copy / download standalone HTML.** A single `.html` file with vanilla canvas
   JS — runs anywhere, no build. Best for sharing/demos.
3. **Copy "AI prompt."** Generate a natural-language spec from the effect's
   metadata + current params, e.g.:
   > "Create a Canvas 2D effect: particles emit from the cursor and are
   > [repelled] from center with gravity 1.4 and trail length 0.9, additive glow,
   > crisp full-clear rendering (no burn-in). Provide a React component."
   This lets people recreate/remix it with any AI tool — great for the open-source
   credibility angle.

### Design
- `lib/export/` with `toComponentSource(meta, params)`, `toStandaloneHtml(...)`,
  `toPrompt(meta, params)`.
- An `ExportPanel` on the detail page: tabs (Component / HTML / Prompt), a code
  block, Copy + Download buttons.
- Keep effect source as a string template (or read at build time) so the exported
  code matches what's running.
- Every export embeds the **crisp-by-default** clear logic so shared code doesn't
  propagate the ghosting bug.

---

## Work item 3 — Ghosting fix by default (shared harness)

See `docs/research/reactive-effects-best-practices.md` §1 for the why.

### Tasks
- Add a `clearMode` to the `useCanvas2D` setup result:
  - `"full"` → `clearRect` every frame (default).
  - `{ trail: number }` → full clear + the effect renders explicit history trails.
  - `{ fade: number, resetEvery: n }` → legacy overdraw fade with a periodic true
    clear (the built-in "overlay reset").
- Refactor **Matrix Rain** and **Cursor Attractor** to explicit history trails
  (full clear) so they stop ghosting; keep a `trail` control that sets history
  length, not fade alpha.
- Document the policy inline so new effects default to crisp.

---

## Work item 4 — Object pooling for particle effects

See best-practices doc §2.

### Tasks
- Add `lib/effects/pool.ts` — a generic `Pool<T>` with `spawn(init)`, `forEach`,
  swap-remove on death, hard cap.
- Migrate Cursor Attractor (and future particle effects) to the pool.
- Wire pool cap into adaptive quality (lower cap when frame time rises).

---

## Work item 5 — Port the next wave of effects (Tier 1)

From `docs/EFFECTS_CATALOG.md`, highest impact + reuse:
- **Custom cursor + trail** (aVOID `CustomCursor`) — global option site-wide.
- **Absorption cursor** (aVOID `void-avoid/CursorSystem`) — unique.
- **Lightning / explosion / confetti toolkit** (aVOID `wreck-avoid`, Lovable).
- **Glitch typewriter** (CRM `GlitchyText`, AllRoads `epilogue-typing`).
- **Neon button + cyberpunk score HUD** (aVOID) — UI showpieces.
- **Borg geometric click** (CRM) — unique click effect.
- **3D tilt card** (AllRoads `tilting-card`).

Each lands as `components/effects/<slug>/` + a `meta.ts` entry (+ presets).

---

## Work item 6 — Harness / perf polish

- Pause rAF when off-screen via `IntersectionObserver` (cards especially — a
  gallery of live canvases is heavy).
- Optional FPS meter overlay (dev/debug toggle).
- Adaptive quality hook (frame-time → particle cap / DPR / trail length).
- Confirm `prefers-reduced-motion` renders a calm state everywhere.

---

## Suggested sequencing

1. **Harness first** (Work item 3 + 6 + pool from 4) — fixes ghosting and perf
   for everything downstream.
2. **Control expansion** (1) — toggles/attract-repel/presets/URL state.
3. **Export** (2) — depends on stable control state.
4. **New effects** (5) — built crisp + pooled from day one, with presets + export.

---

## Decisions (locked)

- **Export:** AI **prompt + React component** first (HTML deferred).
- **Custom cursor:** gallery **demo** only for now (no site-wide toggle yet).
- **Presets:** **yes** — author a few curated looks per effect.
- **Order:** follow the suggested sequencing — **harness/ghosting/pool first**.
