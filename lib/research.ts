import fs from "node:fs";
import path from "node:path";

/**
 * Locally-authored research articles. Each maps to a markdown file under
 * `docs/research/` that is read at build time and rendered on the site.
 */
export interface ResearchArticle {
  slug: string;
  title: string;
  blurb: string;
  file: string;
  tags: string[];
  /** Optional reading-time hint (minutes). */
  minutes?: number;
}

export const articles: ResearchArticle[] = [
  {
    slug: "reactive-effects-best-practices",
    title: "Real-Time Reactive Effects: Best Practices",
    blurb:
      "Why canvas effects ghost (and the real fix), object pooling for particle-heavy scenes, dt timing, DPR scaling, draw-call batching, and a ship checklist.",
    file: "reactive-effects-best-practices.md",
    tags: ["Ghosting", "Object pooling", "Performance"],
    minutes: 9,
  },
];

/**
 * Source research carried over from the original projects. Reference material
 * we mined when building the gallery — listed for provenance, not rendered.
 */
export interface SourceDoc {
  title: string;
  blurb: string;
  source: string;
}

export const sourceDocs: SourceDoc[] = [
  {
    title: "Legacy Cursor Effects Catalog",
    blurb: "A full 28-effect catalog with translation targets.",
    source: "allroadsleadtolovable/docs/research/legacy-cursor-effects-catalog.md",
  },
  {
    title: "Music-Reactive Effects",
    blurb: "Audio analysis architecture, beat detection, band→effect mappings.",
    source: "allroadsleadtolovable/docs/research/music-reactive-effects.md",
  },
  {
    title: "Performance Architecture",
    blurb: "Quality modes, particle budgets, layered-canvas strategy, DPR guidance.",
    source: "allroadsleadtolovable/docs/research/performance-architecture.md",
  },
  {
    title: "Audio Canvas Refactoring Plan",
    blurb: "Decomposing a 2,255-line engine into hooks + effect renderers.",
    source: "1shotCRM/documents/refactoring-plan-audio-canvas-mode.md",
  },
];

export function getArticle(slug: string): ResearchArticle | undefined {
  return articles.find((a) => a.slug === slug);
}

/** Read an article's markdown body at build time. */
export function getArticleContent(slug: string): string | null {
  const article = getArticle(slug);
  if (!article) return null;
  const filePath = path.join(process.cwd(), "docs", "research", article.file);
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}
