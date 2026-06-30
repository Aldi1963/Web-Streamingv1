import { auth } from "@/services/auth-service";
import { redirect, notFound } from "next/navigation";
import { AccountCenter } from "@/components/account-center";

const allowed = ["profile", "subscription", "payments", "invoices", "watchlist", "favorites", "devices", "history", "preferences", "security"];

export default async function DashboardSection({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!allowed.includes(section)) notFound();
  const user = await auth.currentUser();
  if (!user) redirect(`/login?redirect=/dashboard/${section}`);
  return <AccountCenter section={section} />;
}
