"use client";

import type { ComponentType } from "react";
import type { EffectProps } from "@/lib/effects/types";
import { MatrixRain } from "./matrix-rain";
import { CursorAttractor } from "./cursor-attractor";
import { AmbientParticles } from "./ambient-particles";
import { CustomCursorTrail } from "./custom-cursor";
import { AbsorptionCursor } from "./absorption-cursor";
import { LightningStrike } from "./lightning-strike";
import { ConfettiBurst } from "./confetti-burst";
import { BorgClick } from "./borg-click";
import { GlitchText } from "./glitch-text";
import { NeonButton } from "./neon-button";
import { CyberpunkHud } from "./cyberpunk-hud";
import { TiltCard } from "./tilt-card";
import { NovaBurst } from "./nova-burst";
import { GeometricBomb } from "./geometric-bomb";
import { CornerFireworks } from "./corner-fireworks";
import { ParticleText } from "./particle-text";
import { PinwheelRays } from "./pinwheel-rays";
import { WarpField } from "./warp-field";
import { ShockwaveRings } from "./shockwave-rings";
import { ParticleConstellation } from "./particle-constellation";
import { CometImpact } from "./comet-impact";
import { CausticLight } from "./caustic-light";
import { PrismaticMotes } from "./prismatic-motes";
import { SakuraPetals } from "./sakura-petals";
import { HoloGrid } from "./holo-grid";
import { EmberForge } from "./ember-forge";
import { SporeDrift } from "./spore-drift";
import { StarField } from "./star-field";
import { NetworkField } from "./particle-field";
import { AbyssPlankton } from "./abyss-plankton";
import { ElectricBorder } from "./electric-border";
import { LiquidWeb } from "./liquid-web";
import { NeuralNet } from "./neural-net";
import { TouchRipple } from "./touch-ripple";
import { CometOverlay } from "./comet-overlay";
import { OceanWave } from "./ocean-wave";
import { SparkFountain } from "./spark-fountain";
import { InfiniteStarfield } from "./infinite-starfield";
import { CodeOrbit } from "./code-orbit";
import { WireframeCubes } from "./wireframe-cubes";
import { ChainDetonation } from "./chain-detonation";
import { DepthTunnel } from "./depth-tunnel";
import { CrystalCore } from "./crystal-core";
import { GalaxySpiral } from "./galaxy-spiral";
import { WarpStars3D } from "./warp-stars-3d";
import { WaveGrid3D } from "./wave-grid-3d";
import { TorusKnot } from "./torus-knot";
import { DnaHelix } from "./dna-helix";
import { ChargeBurst } from "./charge-burst";
import { VortexTree } from "./vortex-tree";
import { BlackHole } from "./black-hole";
import { RippleDistortion } from "./ripple-distortion";
import { FlipCard } from "./flip-card";

type EffectComponent = ComponentType<{ params: EffectProps }>;

export const effectComponents: Record<string, EffectComponent> = {
  "matrix-rain": MatrixRain,
  "cursor-attractor": CursorAttractor,
  "ambient-particles": AmbientParticles,
  "custom-cursor": CustomCursorTrail,
  "absorption-cursor": AbsorptionCursor,
  "lightning-strike": LightningStrike,
  "confetti-burst": ConfettiBurst,
  "borg-click": BorgClick,
  "glitch-text": GlitchText,
  "neon-button": NeonButton,
  "cyberpunk-hud": CyberpunkHud,
  "tilt-card": TiltCard,
  "nova-burst": NovaBurst,
  "geometric-bomb": GeometricBomb,
  "corner-fireworks": CornerFireworks,
  "particle-text": ParticleText,
  "pinwheel-rays": PinwheelRays,
  "warp-field": WarpField,
  "shockwave-rings": ShockwaveRings,
  "particle-constellation": ParticleConstellation,
  "comet-impact": CometImpact,
  "caustic-light": CausticLight,
  "prismatic-motes": PrismaticMotes,
  "sakura-petals": SakuraPetals,
  "holo-grid": HoloGrid,
  "ember-forge": EmberForge,
  "spore-drift": SporeDrift,
  "star-field": StarField,
  "particle-field": NetworkField,
  "abyss-plankton": AbyssPlankton,
  "electric-border": ElectricBorder,
  "liquid-web": LiquidWeb,
  "neural-net": NeuralNet,
  "touch-ripple": TouchRipple,
  "comet-overlay": CometOverlay,
  "ocean-wave": OceanWave,
  "spark-fountain": SparkFountain,
  "infinite-starfield": InfiniteStarfield,
  "code-orbit": CodeOrbit,
  "wireframe-cubes": WireframeCubes,
  "chain-detonation": ChainDetonation,
  "depth-tunnel": DepthTunnel,
  "crystal-core": CrystalCore,
  "galaxy-spiral": GalaxySpiral,
  "warp-stars-3d": WarpStars3D,
  "wave-grid-3d": WaveGrid3D,
  "torus-knot": TorusKnot,
  "dna-helix": DnaHelix,
  "charge-burst": ChargeBurst,
  "vortex-tree": VortexTree,
  "black-hole": BlackHole,
  "ripple-distortion": RippleDistortion,
  "flip-card": FlipCard,
};

export function getEffectComponent(slug: string): EffectComponent | undefined {
  return effectComponents[slug];
}
