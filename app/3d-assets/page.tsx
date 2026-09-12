import type { Metadata } from "next";
import { ThreeAssetLab } from "./ThreeAssetLab";

export const metadata: Metadata = {
  title: "Free 3D Asset Lab · Ideas Visualized",
  description:
    "A preview of original, developer-ready 3D asset packs being built for Three.js and real-time games.",
};

export default function ThreeAssetsPage() {
  return <ThreeAssetLab />;
}
