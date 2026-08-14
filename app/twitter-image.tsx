import { ImageResponse } from "next/og";
import { effectsMeta } from "@/lib/effects/meta";
import { SocialCard } from "@/lib/social-card";

export const alt = "Ideas Visualized interactive effects gallery";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(<SocialCard effectCount={effectsMeta.length} />, size);
}
