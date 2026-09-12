import { DEFAULTS, settings, tileGrid, inverseTransition } from './engine.mjs';

const root = document.documentElement;
const mode = new URLSearchParams(location.search).get('mode') === 'hover' ? 'hover' : 'transition';
document.body.dataset.mode = mode;
const button = document.querySelector('#flip'), replay = document.querySelector('#replay');
const status = document.querySelector('#status'), canvas = document.querySelector('#field');
const context = canvas.getContext('2d');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let params = { ...DEFAULTS }, job = null, active = true, frame = 0, pulses = [], lastPulse = 0;
let width = innerWidth, height = innerHeight;

function applyTheme(theme) {
  root.dataset.theme = theme;
  button.setAttribute('aria-pressed', String(theme === 'dark'));
  button.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
  document.querySelector('#flip-label').textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
}
function statusText() {
  status.textContent = reduced.matches ? 'Reduced motion is on.' : mode === 'transition' && !document.startViewTransition ? 'Instant switch: this browser has no View Transitions support.' : '';
}
function flip(event) {
  if (job || !active) return;
  const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  if (mode === 'hover') { applyTheme(theme); return; }
  const target = event?.currentTarget instanceof Element ? event.currentTarget : button;
  const box = target.getBoundingClientRect();
  let origin = event?.detail ? { x: event.clientX, y: event.clientY } : { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  if (params.origin === 'center') origin = { x: innerWidth / 2, y: innerHeight / 2 };
  if (params.origin === 'corner') origin = { x: innerWidth, y: 0 };
  const focused = document.activeElement;
  const current = inverseTransition(document, {
    origin, params, apply: () => applyTheme(theme),
    onState(busy) {
      button.disabled = replay.disabled = busy;
      button.setAttribute('aria-busy', String(busy));
      replay.setAttribute('aria-busy', String(busy));
      if (!busy) {
        if ((focused === button || focused === replay) && (document.activeElement === document.body || document.activeElement === focused)) focused.focus({ preventScroll: true });
        statusText();
      }
    },
  });
  job = current;
  current.finished.finally(() => { if (job === current) job = null; });
}

function resize() {
  width = innerWidth; height = innerHeight;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  context?.setTransform(dpr, 0, 0, dpr, 0, 0);
  pulses = [];
}
function stopField() {
  cancelAnimationFrame(frame); frame = 0; pulses = [];
  context?.clearRect(0, 0, width, height);
}
function draw(time) {
  frame = 0;
  if (!context || !active || document.hidden || reduced.matches) { stopField(); return; }
  const ctx = context;
  ctx.clearRect(0, 0, width, height);
  const duration = params.flipMs + params.spreadMs;
  pulses = pulses.filter(pulse => time - pulse.time < duration);
  const { cols, rows, cw, ch } = tileGrid(width, height, params);
  const accent = getComputedStyle(root).getPropertyValue('--accent');
  ctx.fillStyle = accent; ctx.strokeStyle = accent;
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const x = (col + .5) * cw, y = (row + .5) * ch;
    let energy = 0, angle = 0;
    for (const pulse of pulses) {
      const distance = Math.hypot(x - pulse.x, y - pulse.y);
      if (distance > params.hoverRadius) continue;
      const local = (time - pulse.time - distance / params.hoverRadius * params.spreadMs) / params.flipMs;
      if (local <= 0 || local >= 1) continue;
      const envelope = Math.sin(local * Math.PI) * (1 - distance / params.hoverRadius);
      if (envelope > energy) { energy = envelope; angle = local * Math.PI; }
    }
    if (energy < .005) continue;
    const face = Math.max(1, (cw - 3) * Math.abs(Math.cos(angle)));
    ctx.globalAlpha = energy * params.intensity;
    ctx.fillRect(x - face / 2, y - ch / 2 + 1.5, face, ch - 3);
    ctx.globalAlpha = energy * Math.min(.6, params.intensity + .16);
    ctx.strokeRect(x - cw / 2 + .5, y - ch / 2 + .5, cw - 1, ch - 1);
  }
  ctx.globalAlpha = 1;
  if (pulses.length) frame = requestAnimationFrame(draw);
}
function pulse(x, y, force = false) {
  if (mode !== 'hover' || !active || document.hidden || reduced.matches) return;
  const time = performance.now();
  if (!force && time - lastPulse < 100) return;
  lastPulse = time;
  pulses.push({ x, y, time });
  if (pulses.length > 6) pulses.shift();
  if (!frame) frame = requestAnimationFrame(draw);
}

button.addEventListener('click', flip);
replay.addEventListener('click', event => {
  if (mode === 'hover') pulse(innerWidth / 2, innerHeight / 2, true);
  else flip(event);
});
document.addEventListener('click', event => {
  if (event.target.closest('button,a')) return;
  if (mode === 'hover') pulse(event.clientX, event.clientY, true);
  else flip(event);
});
document.addEventListener('pointermove', event => { if (event.pointerType !== 'touch') pulse(event.clientX, event.clientY); }, { passive: true });
document.addEventListener('visibilitychange', () => { if (document.hidden) { job?.cancel(); stopField(); } });
addEventListener('resize', resize);
addEventListener('pagehide', () => { job?.cancel(); stopField(); });
reduced.addEventListener('change', () => { if (reduced.matches) { job?.cancel(); stopField(); } statusText(); });
addEventListener('message', event => {
  if (event.origin !== location.origin || event.source !== parent || parent === window) return;
  if (event.data?.type === 'inverse-canvas:params' && event.data.params && typeof event.data.params === 'object') {
    job?.cancel();
    params = settings(event.data.params);
    root.dataset.palette = params.palette;
    stopField();
  }
  if (event.data?.type === 'inverse-canvas:active' && typeof event.data.active === 'boolean') {
    active = event.data.active;
    if (!active) { job?.cancel(); stopField(); }
  }
});
if (mode === 'hover') {
  replay.textContent = 'Pulse the field ↗';
  document.querySelector('#instruction').textContent = 'Move over the canvas, or tap to send a pulse.';
  document.title = 'Pixel Field | Ideas Visualized';
}
resize(); statusText();
if (parent !== window) parent.postMessage({ type: 'inverse-canvas:ready' }, location.origin);
