import type { EffectControl, EffectMeta, EffectProps } from "./types";
import { defaultParams } from "./types";

/** A random valid value for a single control. */
function randomControlValue(c: EffectControl): number | string | boolean {
  switch (c.type) {
    case "range": {
      const min = c.min ?? 0;
      const max = c.max ?? 1;
      const step = c.step ?? 0.01;
      const steps = Math.max(1, Math.round((max - min) / step));
      return Number((min + Math.round(Math.random() * steps) * step).toFixed(4));
    }
    case "toggle":
      return Math.random() > 0.5;
    case "select":
      return c.options?.[Math.floor(Math.random() * (c.options?.length || 1))]
        ?.value ?? String(c.default);
    case "color": {
      const h = Math.floor(Math.random() * 0xffffff);
      return `#${h.toString(16).padStart(6, "0")}`;
    }
    default:
      return c.default;
  }
}

export function randomParams(meta: EffectMeta): EffectProps {
  const params: EffectProps = {};
  for (const c of meta.controls) params[c.key] = randomControlValue(c);
  return params;
}

/** Merge a partial param set (e.g. a preset) over the defaults. */
export function mergeParams(meta: EffectMeta, partial: EffectProps): EffectProps {
  return { ...defaultParams(meta), ...partial };
}

/** Compact URL encoding: only values that differ from defaults. */
export function encodeParams(meta: EffectMeta, params: EffectProps): string {
  const def = defaultParams(meta);
  const diff: EffectProps = {};
  for (const c of meta.controls) {
    if (params[c.key] !== def[c.key]) diff[c.key] = params[c.key];
  }
  if (Object.keys(diff).length === 0) return "";
  return encodeURIComponent(JSON.stringify(diff));
}

export function decodeParams(meta: EffectMeta, encoded: string | null): EffectProps {
  const base = defaultParams(meta);
  if (!encoded) return base;
  try {
    const diff = JSON.parse(decodeURIComponent(encoded)) as EffectProps;
    const valid: EffectProps = {};
    const keys = new Set(meta.controls.map((c) => c.key));
    for (const [k, v] of Object.entries(diff)) {
      if (keys.has(k)) valid[k] = v;
    }
    return { ...base, ...valid };
  } catch {
    return base;
  }
}
