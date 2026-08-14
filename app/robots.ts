import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://ideasvisualized.com/sitemap.xml",
    host: "https://ideasvisualized.com",
  };
}
