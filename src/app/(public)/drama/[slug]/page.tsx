import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DramaDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await db.content
    .findFirst({
      where: { slug, isActive: true },
      select: { id: true },
    })
    .catch(() => null);

  if (!item) notFound();
  redirect(`/watch/${item.id}`);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await db.content
    .findFirst({
      where: { slug, isActive: true },
      select: { title: true, description: true, posterUrl: true },
    })
    .catch(() => null);

  if (!item) return { title: "Drama tidak ditemukan" };

  return {
    title: item.title,
    description: item.description?.slice(0, 160) ?? "Tonton drama seru di Clipku Streaming",
    alternates: { canonical: `/drama/${slug}` },
    openGraph: {
      title: item.title,
      description: item.description?.slice(0, 160),
      url: `/drama/${slug}`,
      type: "video.movie" as const,
      images: item.posterUrl ? [item.posterUrl] : [],
    },
  };
}
