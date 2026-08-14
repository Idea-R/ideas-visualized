import type { MetadataRoute } from "next";
import { effectsMeta } from "@/lib/effects/meta";
import { articles } from "@/lib/research";

const SITE_URL = "https://ideasvisualized.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/gallery`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/game-assets`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/experiences`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/experiences/scroll`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/experiences/simon`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/research`, changeFrequency: "monthly", priority: 0.7 },
  ];

  const effectRoutes: MetadataRoute.Sitemap = effectsMeta.map((effect) => ({
    url: `${SITE_URL}/gallery/${effect.slug}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const researchRoutes: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${SITE_URL}/research/${article.slug}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...effectRoutes, ...researchRoutes];
}
