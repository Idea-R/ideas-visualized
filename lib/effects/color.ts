/**
 * Shared color/palette helpers for effects. Lets every effect support a
 * consistent "Color" control: Single hue, Dual (blend between two hues), or
 * Rainbow (hue spread across the effect).
 *
 * Usage in an effect:
 *   const colorMode = String(params.colorMode ?? "single") as ColorMode;
 *   const hue = Number(params.hue);
 *   const hue2 = Number(params.hue2 ?? hue);
 *   // gradient across a particle's position / index factor t in [0,1]:
 *   ctx.fillStyle = paletteColor(colorMode, hue, hue2, t);
 *   // alternating two-tone: pass t = i % 2 (0 → hue, 1 → hue2).
 */
export type ColorMode = "single" | "dual" | "rainbow";

/** Shortest-path hue interpolation around the 360° wheel. */
function lerpHue(a: number, b: number, t: number): number {
  const delta = (((b - a) % 360) + 540) % 360 - 180;
  return (a + delta * t + 360) % 360;
}

/** Resolve a hue (degrees) for factor `t` in [0,1] under the given mode. */
export function paletteHue(
  mode: ColorMode,
  hue: number,
  hue2: number,
  t: number
): number {
  if (mode === "rainbow") return (((t * 360) % 360) + 360) % 360;
  if (mode === "dual") return lerpHue(hue, hue2, Math.max(0, Math.min(1, t)));
  return ((hue % 360) + 360) % 360;
}

/** Convenience: a full hsl() string for factor `t`. */
export function paletteColor(
  mode: ColorMode,
  hue: number,
  hue2: number,
  t: number,
  sat = 100,
  light = 62
): string {
  return `hsl(${Math.round(paletteHue(mode, hue, hue2, t))}, ${sat}%, ${light}%)`;
}

/** Read the standard color params off an effect's props with sane fallbacks. */
export function readPalette(params: Record<string, number | string | boolean>) {
  const mode = String(params.colorMode ?? "single") as ColorMode;
  const hue = Number(params.hue ?? 200);
  const hue2 = Number(params.hue2 ?? hue);
  return { mode, hue, hue2 };
}
