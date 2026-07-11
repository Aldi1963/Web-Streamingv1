import { auth } from "@/services/auth-service";
import { redirect, notFound } from "next/navigation";
import { AccountCenter } from "@/components/account-center";

const allowed = ["profile", "subscription", "payments", "invoices", "watchlist", "favorites", "devices", "history", "preferences", "security"];
const aliases: Record<string, string> = {
  profile: "preferences",
  security: "preferences",
  invoices: "payments",
  watchlist: "",
  favorites: "history",
};

export default async function DashboardSection({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!allowed.includes(section)) notFound();
  if (section in aliases) redirect(aliases[section] ? `/dashboard/${aliases[section]}` : "/dashboard");
  const user = await auth.currentUser();
  if (!user) redirect(`/login?redirect=/dashboard/${section}`);
  return <AccountCenter section={section} />;
}
