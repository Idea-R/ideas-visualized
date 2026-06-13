import { notFound } from "next/navigation";
import { effectsMeta, getMeta } from "@/lib/effects/meta";
import { EmbedStage } from "@/components/EmbedStage";

export function generateStaticParams() {
  return effectsMeta.map((e) => ({ slug: e.slug }));
}

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!getMeta(slug)) notFound();
  return <EmbedStage slug={slug} />;
}
