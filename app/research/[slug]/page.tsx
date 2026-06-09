import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/Markdown";
import { articles, getArticle, getArticleContent } from "@/lib/research";

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticle(slug);
  return {
    title: article
      ? `${article.title} — Ideas Visualized`
      : "Research — Ideas Visualized",
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticle(slug);
  const content = getArticleContent(slug);
  if (!article || !content) notFound();

  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <Link
        href="/research"
        className="text-sm text-muted transition-colors hover:text-fg"
      >
        ← Back to research
      </Link>
      <div className="mt-6 flex flex-wrap gap-1.5">
        {article.tags.map((t) => (
          <span
            key={t}
            className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-muted"
          >
            {t}
          </span>
        ))}
      </div>
      <article className="mt-6">
        <Markdown>{content}</Markdown>
      </article>
    </main>
  );
}
