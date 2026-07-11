import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LatestRedirect({
  searchParams,
}: {
  searchParams: Promise<{ provider?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams({ tab: "terbaru" });
  if (params.provider) query.set("provider", params.provider);
  if (params.page) query.set("page", params.page);
  redirect(`/katalog?${query}`);
}
