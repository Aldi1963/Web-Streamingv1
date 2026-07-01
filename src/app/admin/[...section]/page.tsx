import { auth } from "@/services/auth-service";
import { redirect } from "next/navigation";
import { AdminSettingsForm } from "@/components/admin-settings-form";
import { AdminConsole } from "@/components/admin-console";
import { AdminLayout } from "@/components/admin-layout";
import { AdminIntegration } from "@/components/admin-integration";
import { AdminMonitoring } from "@/components/admin-monitoring";
import { AdminPlans } from "@/components/admin-plans";
import { AdminProviders } from "@/components/admin-providers";
import { AdminSeo } from "@/components/admin-seo";
import { AdminSectionTabs } from "@/components/admin-section-tabs";

export default async function Admin({
  params,
  searchParams,
}: {
  params: Promise<{ section: string[] }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await auth.currentUser();
  if (!user || !["SUPER_ADMIN","ADMIN","CONTENT_MANAGER"].includes(user.role)) redirect("/login");
  const section = (await params).section.join("/");
  const legacy: Record<string, string> = {
    devices: "/admin/users?tab=devices",
    subscriptions: "/admin/monetization?tab=subscriptions",
    payments: "/admin/monetization?tab=payments",
    plans: "/admin/monetization?tab=plans",
    contents: "/admin/catalog?tab=contents",
    providers: "/admin/catalog?tab=providers",
    "api-clipku": "/admin/integrations?tab=api",
    "error-logs": "/admin/integrations?tab=monitoring",
    seo: "/admin/settings?tab=seo",
    "payment-settings": "/admin/settings?tab=payment",
  };
  if (legacy[section]) redirect(legacy[section]);

  const requested = (await searchParams).tab;
  const groups: Record<string, { title: string; tabs: Array<[string,string]>; fallback: string }> = {
    users: { title: "Pengguna", tabs: [["accounts","Akun pengguna"],["devices","Perangkat"]], fallback: "accounts" },
    monetization: { title: "Monetisasi", tabs: [["subscriptions","Langganan"],["payments","Pembayaran"],["plans","Paket"]], fallback: "subscriptions" },
    catalog: { title: "Katalog", tabs: [["contents","Konten"],["providers","Provider"]], fallback: "contents" },
    integrations: { title: "Integrasi", tabs: [["api","Integrasi API"],["monitoring","Monitoring & log"]], fallback: "api" },
    settings: { title: "Pengaturan", tabs: [["web","Pengaturan web"],["seo","SEO"],["payment","Payment gateway"]], fallback: "web" },
  };
  const group = groups[section];
  if (user.role === "CONTENT_MANAGER" && ["users","monetization","settings"].includes(section)) redirect("/admin/dashboard");
  const tab = group?.tabs.some(([value]) => value === requested) ? requested! : group?.fallback;
  const title = group?.title || section.replaceAll("-", " ");
  const webhookUrl = `${(process.env.APP_URL || "https://drama.clipku.com").replace(/\/+$/,"")}/api/payments/aldiqris/webhook`;

  return <main className="admin-context"><AdminLayout role={user.role} title={title}>
    {group && <AdminSectionTabs base={`/admin/${section}`} active={tab} tabs={group.tabs}/>}
    {section === "users" ? <AdminConsole section={tab === "devices" ? "devices" : "users"}/> :
      section === "monetization" ? (tab === "plans" ? <AdminPlans/> : <AdminConsole section={tab}/>) :
      section === "catalog" ? (tab === "providers" ? <AdminProviders/> : <AdminConsole section="contents"/>) :
      section === "integrations" ? (tab === "monitoring" ? <AdminMonitoring/> : <AdminIntegration/>) :
      section === "settings" ? (tab === "seo" ? <AdminSeo/> : <AdminSettingsForm section={tab === "payment" ? "payment-settings" : "settings"} webhookUrl={webhookUrl}/>) :
      <AdminConsole section={section}/>}
  </AdminLayout></main>;
}
