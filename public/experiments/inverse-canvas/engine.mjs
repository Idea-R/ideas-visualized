// Extracted from AI Agency Underground's approved inverse-canvas theme switch.
// Native old/new document snapshots, shaped by a bounded set of tile masks.
export const DEFAULTS = Object.freeze({
  tileCount: 520, spreadMs: 820, flipMs: 490, gridMs: 280,
  origin: 'pointer', palette: 'teal', hoverRadius: 180, intensity: .35,
});
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
export function settings(input = {}) {
  const number = (key, min, max) => clamp(Number.isFinite(Number(input[key])) ? Number(input[key]) : DEFAULTS[key], min, max);
  const choice = (key, values) => values.includes(input[key]) ? input[key] : DEFAULTS[key];
  return {
    tileCount: Math.round(number('tileCount', 120, 1600)),
    spreadMs: number('spreadMs', 200, 1800), flipMs: number('flipMs', 200, 1200),
    gridMs: number('gridMs', 0, 700), hoverRadius: number('hoverRadius', 80, 320),
    intensity: number('intensity', .1, .8), origin: choice('origin', ['pointer', 'center', 'corner']),
    palette: choice('palette', ['teal', 'violet', 'amber']),
  };
}
export function tileGrid(width, height, input = DEFAULTS) {
  const options = settings(input);
  // Same 32px floor as the approved switch at 520 tiles; scales with density.
  const size = Math.max(12, 32 * Math.sqrt(520 / options.tileCount), Math.sqrt(width * height / options.tileCount));
  const cols = Math.ceil(width / size), rows = Math.ceil(height / size);
  return { cols, rows, cw: width / cols, ch: height / rows, count: cols * rows };
}
export function tileFrames(width, height, origin, input = DEFAULTS) {
  const options = settings(input);
  const grid = tileGrid(width, height, options);
  const { cols, rows, cw, ch } = grid;
  const far = Math.max(1, Math.hypot(Math.max(origin.x, width - origin.x), Math.max(origin.y, height - origin.y)));
  const tiles = [];
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const x = (col + .5) * cw, y = (row + .5) * ch;
    tiles.push({ x, y, delay: Math.hypot(x - origin.x, y - origin.y) / far * options.spreadMs + ((col * 7 + row * 13) % 5) * 13, sign: (col + row) % 2 ? 1 : -1 });
  }
  const duration = options.spreadMs + options.flipMs + 340;
  const old = [], next = [];
  for (let frame = 0; frame <= 48; frame++) {
    const time = frame / 48 * duration;
    let oldPath = '', newPath = '';
    for (const tile of tiles) {
      const p = clamp((time - tile.delay - 160) / options.flipMs);
      const angle = p * Math.PI, face = Math.cos(angle), sin = Math.sin(angle);
      const halfWidth = Math.max(.01, (cw / 2 + .55) * Math.abs(face) - sin * 1.6);
      const shear = sin * tile.sign * ch * .075, halfHeight = ch / 2 + .55 - sin * 1.3;
      const { x, y } = tile;
      const path = `M${(x-halfWidth).toFixed(1)} ${(y-halfHeight+shear).toFixed(1)}L${(x+halfWidth).toFixed(1)} ${(y-halfHeight-shear).toFixed(1)}L${(x+halfWidth).toFixed(1)} ${(y+halfHeight-shear).toFixed(1)}L${(x-halfWidth).toFixed(1)} ${(y+halfHeight+shear).toFixed(1)}Z`;
      const absent = `M${x.toFixed(1)} ${y.toFixed(1)}L${x.toFixed(1)} ${y.toFixed(1)}L${x.toFixed(1)} ${y.toFixed(1)}L${x.toFixed(1)} ${y.toFixed(1)}Z`;
      oldPath += face >= 0 ? path : absent;
      newPath += face < 0 ? path : absent;
    }
    old.push({ clipPath: `path('${oldPath}')`, offset: frame / 48 });
    next.push({ clipPath: `path('${newPath}')`, offset: frame / 48 });
  }
  return { old, next, duration, ...grid };
}

// One owner per document. Repeated input cannot start overlapping snapshots.
const owners = new WeakMap();
export function inverseTransition(doc, { origin, params, apply, onState = () => {} }) {
  if (owners.has(doc)) return owners.get(doc);
  const win = doc.defaultView, root = doc.documentElement;
  const preference = win.matchMedia('(prefers-reduced-motion: reduce)');
  let transition, lattice, cancelled = false;
  const animations = [];
  const abort = new win.AbortController();
  const job = {
    cancel() { cancelled = true; transition?.skipTransition(); animations.forEach(a => a.cancel()); },
    finished: null,
  };
  owners.set(doc, job);
  // Defer until the job is registered, including synchronous fallback paths.
  job.finished = Promise.resolve().then(async () => {
    onState(true);
    try {
      if (cancelled || preference.matches || !doc.startViewTransition) { apply(); return; }
      const options = settings(params);
      const frames = tileFrames(win.innerWidth, win.innerHeight, origin, options);
      root.dataset.inverseTransition = 'pixels';
      root.dataset.inverseTiles = String(frames.count);
      root.style.setProperty('--flip-cell-x', `${frames.cw}px`);
      root.style.setProperty('--flip-cell-y', `${frames.ch}px`);
      const listen = { signal: abort.signal };
      win.addEventListener('resize', job.cancel, listen);
      win.addEventListener('wheel', job.cancel, { ...listen, passive: true });
      win.addEventListener('touchmove', job.cancel, { ...listen, passive: true });
      win.addEventListener('keydown', e => { if (e.key === 'Escape') job.cancel(); }, listen);
      doc.addEventListener('visibilitychange', () => { if (doc.hidden) job.cancel(); }, listen);
      preference.addEventListener('change', () => { if (preference.matches) job.cancel(); }, listen);
      lattice = doc.createElement('div');
      lattice.className = 'inverse-lattice';
      lattice.setAttribute('aria-hidden', 'true');
      doc.body.append(lattice);
      const radius = Math.hypot(Math.max(origin.x, win.innerWidth-origin.x), Math.max(origin.y, win.innerHeight-origin.y));
      const charge = lattice.animate([
        { clipPath: `circle(0px at ${origin.x}px ${origin.y}px)` },
        { clipPath: `circle(${radius}px at ${origin.x}px ${origin.y}px)` },
      ], { duration: options.gridMs, easing: 'cubic-bezier(.15,.6,.3,1)', fill: 'both' });
      animations.push(charge);
      await charge.finished;
      if (cancelled) { apply(); return; }
      transition = doc.startViewTransition(() => { lattice.remove(); apply(); });
      await transition.ready;
      if (cancelled) { transition.skipTransition(); return; }
      for (const [face, keyframes] of [['old', frames.old], ['new', frames.next]]) {
        const animation = root.animate(keyframes, { duration: frames.duration, easing: 'linear', fill: 'both', pseudoElement: `::view-transition-${face}(root)` });
        animation.id = `inverse-${face}`;
        animations.push(animation);
      }
      await Promise.all(animations.map(a => a.finished));
      animations.forEach(a => a.cancel());
      await transition.finished;
    } catch {
      transition?.skipTransition();
      apply();
    } finally {
      animations.forEach(a => a.cancel());
      lattice?.remove();
      abort.abort();
      delete root.dataset.inverseTransition;
      delete root.dataset.inverseTiles;
      owners.delete(doc);
      onState(false);
    }
  });
  return job;
}
