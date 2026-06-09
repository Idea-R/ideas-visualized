# Best Practices for Real-Time Reactive Visual Effects

Hard-won notes for building Canvas 2D / Web Audio effects and game VFX that stay
**crisp** and **fast**, even when spawning thousands of short-lived elements.
This is the "how we built it / what we learned" reference for Ideas Visualized.

---

## 1. The ghosting / burn-in problem (and the real fix)

### Symptom
After an effect traverses the canvas it leaves a faint ghost trail in the space
it passed through. Over time these residuals accumulate and wash out the whole
image into a muddy haze. It looks like the canvas is "remembering" old frames.

### Root cause: trail-fade by overdraw + 8-bit rounding
Most trail effects don't clear the canvas each frame. Instead, to get motion
blur cheaply, they paint a semi-transparent background rectangle over the
previous frame:

```js
// Common trick — creates trails, but causes burn-in
ctx.fillStyle = "rgba(5, 6, 10, 0.12)";
ctx.fillRect(0, 0, w, h);
```

Each frame, a pixel of color `C` becomes:

```
newC = C * (1 - 0.12) + bg * 0.12
```

The canvas stores **8 bits per channel** (0–255). Once `C` is within a few
levels of `bg`, that multiply **rounds back to the same integer**, so the pixel
never actually reaches the true background. The leftover 1–3 levels are a
**permanent ghost**. Anything using `globalCompositeOperation = "lighter"`
(additive) makes it worse, because it keeps *adding* brightness with no decay.

> The "overlay I made to keep it fresh" = a periodic fully-opaque clear that
> resets the accumulated residual. It works, but it's a workaround.

### Fixes (in order of preference)

**A. Full clear every frame + explicit trails (default for new effects).**
Clear completely, then render trails as real geometry from stored history. Crisp
forever, no burn-in.

```js
ctx.clearRect(0, 0, w, h);            // zero residual
for (const p of particles) {
  // draw p.history as a fading polyline / dots
  for (let i = 0; i < p.history.length; i++) {
    const a = i / p.history.length;   // 0..1 fade
    ctx.globalAlpha = a;
    ctx.fillRect(p.history[i].x, p.history[i].y, size, size);
  }
}
ctx.globalAlpha = 1;
```

**B. Keep overdraw trails but make them honest.** If you want the cheap
motion-blur look, accept that pure overdraw asymptotes. Mitigate by:
- Using a higher fade alpha (≥ 0.2) so residual sits below perceptible levels.
- Doing a **true clear** on a cadence (e.g. every Nth frame, or on resize /
  scene change) — a built-in version of the "overlay reset."
- Never combining overdraw fade with `lighter` on the *persistent* layer.

**C. Two-layer compositing.** A persistent "trail" canvas decayed deliberately,
plus a fully-cleared "crisp" canvas on top for sharp elements. More control, a
bit more cost.

### Our default policy
- Effects that don't need trails: **`clearRect` every frame.** (e.g. ambient
  particle network — already ghost-free.)
- Effects that want trails: **full clear + explicit history-based trails**, with
  an optional `trail` control that adjusts history length, *not* fade-overdraw.
- The shared canvas harness exposes a `clearMode` so this is correct by default.

---

## 2. Object pooling (why reuse beats create/destroy)

### The counter-intuitive part
"If the objects still exist when pooled, how is that faster than deleting them?"
Because the cost was never the objects sitting in memory — it was the
**allocation and garbage collection churn**.

### What actually happens without pooling
Spawning thousands of particles/enemies per second means thousands of `new`
allocations per second. When they "die," they become garbage. The JS **garbage
collector** must periodically stop your code, walk the heap, and free them.
Those GC pauses land on random frames and show up as **stutter / dropped
frames** — the worst kind of jank because it's unpredictable.

### What pooling does
Pre-allocate a fixed array of objects **once**. Track which are active. When one
dies, flag it inactive (don't free it). When you need a new one, grab an
inactive slot and **reset its fields** instead of allocating.

```js
class ParticlePool {
  constructor(max) {
    this.pool = Array.from({ length: max }, () => makeParticle());
    this.count = 0;                 // active particles occupy [0, count)
  }
  spawn(init) {
    if (this.count >= this.pool.length) return null; // cap reached
    const p = this.pool[this.count++];
    init(p);                        // reset x, y, vx, life, ...
    return p;
  }
  update(dt) {
    for (let i = this.count - 1; i >= 0; i--) {
      const p = this.pool[i];
      stepParticle(p, dt);
      if (p.life <= 0) {            // "destroy" = swap-remove, no GC
        this.pool[i] = this.pool[--this.count];
        this.pool[this.count] = p;
      }
    }
  }
}
```

### Why it wins
- **No allocations in the hot loop → no GC pauses.** Steady, predictable frames.
- **Cache locality.** Reusing the same objects keeps memory access patterns warm.
- **Bounded memory.** A pool also enforces a hard cap (great for perf scaling).

### Trade-offs / gotchas
- Costs a fixed chunk of memory up front (size it to your worst case).
- You **must fully reset** every field on reuse, or stale state leaks into the
  "new" particle (a classic pooling bug).
- "Swap-remove" (move last active into the dead slot) avoids array shifting and
  keeps the active set contiguous.

This is the single biggest perf lever for games with many little units/enemies
and for dense particle finales.

---

## 3. Other best practices we've learned

### Frame loop & timing
- **Always use `dt` (delta time)**, never assume 60fps. Multiply motion by
  seconds elapsed so speed is consistent across devices/refresh rates.
- **Clamp `dt`** (e.g. `min(dt, 0.05)`) so a tab-switch or hitch doesn't teleport
  everything across the screen on the next frame.
- For physics that must be deterministic, use a **fixed timestep accumulator**.

### Canvas / DPR
- Scale the backing store by `devicePixelRatio` (cap at ~2) for crisp rendering
  without exploding fill cost on 3x phones.
- Re-create size-dependent state on resize via `ResizeObserver`.

### Throughput
- **Batch draw calls**: group by color/blend mode, set `fillStyle` once, draw
  many. State changes (`shadowBlur`, gradients, `globalCompositeOperation`) are
  expensive — minimize switches.
- **Cull** anything off-screen before drawing.
- **`shadowBlur` is costly.** Prefer pre-baked radial-gradient sprites for glow.
- For heavy static sprites, **pre-render to an offscreen canvas** once and
  `drawImage` it (cheaper than re-pathing every frame).

### Adaptive quality
- Measure frame time; when it climbs, **shed load**: lower particle caps, drop
  trail length, reduce DPR, simplify glow. (See `performance-config.ts` patterns
  in AllRoadsLeadToCursor / Lovable's `tracks.ts`.)
- Ship **mobile vs desktop** budgets; auto-detect and downgrade gracefully.

### Audio-reactive specifics
- **Precompute** band/beat data offline when the track is fixed (Lovable's
  `generate-audio-analysis.mjs`) → perfectly stable, no per-frame FFT cost.
- Use a **live `AnalyserNode`** only when the audio is dynamic/user-supplied.
- Smooth band values (lerp) so visuals don't strobe on every FFT jitter.

### Lifecycle hygiene
- Pause the rAF loop when the tab is hidden (`visibilitychange`) and when the
  effect scrolls off-screen (`IntersectionObserver`).
- Respect `prefers-reduced-motion`: render a calm/static state.
- Always return a cleanup that cancels rAF and removes listeners.

---

## 4. Checklist for any new effect

- [ ] Uses `dt`, clamps it
- [ ] Correct `clearMode` (full clear unless trails are intended; trails are
      explicit, not overdraw burn-in)
- [ ] Pools objects if it spawns/destroys frequently; resets all fields on reuse
- [ ] DPR-aware, resizes cleanly
- [ ] Minimal state switches; glow via sprites not `shadowBlur` where hot
- [ ] Off-screen elements culled
- [ ] Pauses when hidden / off-screen; honors reduced-motion
- [ ] Cleans up on unmount
