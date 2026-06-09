import { notFound } from "next/navigation";
import { effectsMeta, getMeta } from "@/lib/effects/meta";
import { EffectDetail } from "@/components/EffectDetail";

export function generateStaticParams() {
  return effectsMeta.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const effect = getMeta(slug);
  return { title: effect ? `${effect.title} — Ideas Visualized` : "Effect" };
}

export default async function EffectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!getMeta(slug)) notFound();
  return <EffectDetail slug={slug} />;
}
