export type ControlType =
  | "range"
  | "color"
  | "toggle"
  | "select"
  | "text";

export interface EffectControl {
  key: string;
  label: string;
  type: ControlType;
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: string }[];
  /** For "text": max input length. */
  maxLength?: number;
  /** For "text": placeholder hint. */
  placeholder?: string;
  /**
   * Conditional visibility: only show this control when the named control's
   * current value is one of `in`. Used e.g. to reveal a second hue only when
   * Color mode is "dual".
   */
  showIf?: { key: string; in: (string | number | boolean)[] };
  default: number | string | boolean;
}

export type EffectProps = Record<string, number | string | boolean>;

/**
 * Pure, serializable effect metadata. Lives in a non-client module so it can be
 * imported by server components (registry, pages, generateStaticParams) without
 * being turned into a client-reference proxy.
 */
export interface EffectPreset {
  name: string;
  params: EffectProps;
}

export interface EffectMeta {
  slug: string;
  title: string;
  blurb: string;
  source: {
    project: string;
    path: string;
  };
  tags: string[];
  tier: 1 | 2 | 3;
  /**
   * Which listing the effect belongs to. Defaults to "effect" (main Gallery)
   * when omitted. "game-asset" entries appear on the dedicated Game Assets page.
   */
  category?: "effect" | "game-asset";
  /** Optional sub-section header on the Game Assets page (e.g. "Combat / Spells"). */
  gameGroup?: string;
  controls: EffectControl[];
  /** Curated looks; merged over defaults when applied. */
  presets?: EffectPreset[];
}

/** Build a default params object from an effect's controls. */
export function defaultParams(meta: EffectMeta): EffectProps {
  const params: EffectProps = {};
  for (const c of meta.controls) params[c.key] = c.default;
  return params;
}
