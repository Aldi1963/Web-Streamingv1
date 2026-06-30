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
export default async function Admin({params}:{params:Promise<{section:string[]}>}){
  const user=await auth.currentUser(); if(!user||!["SUPER_ADMIN","ADMIN","CONTENT_MANAGER"].includes(user.role))redirect("/login");
  const section=(await params).section.join("/");
  const title=section==="api-clipku"?"Integrasi API":section==="error-logs"?"Monitoring & Log":section.replaceAll("-"," ");
  return <main className="admin-context"><AdminLayout role={user.role} title={title}>
    {section==="api-clipku"?<AdminIntegration/>:section==="error-logs"?<AdminMonitoring/>:section==="plans"?<AdminPlans/>:section==="providers"?<AdminProviders/>:section==="seo"?<AdminSeo/>:["settings","payment-settings"].includes(section)?<AdminSettingsForm section={section}/>:<AdminConsole section={section}/>}
  </AdminLayout></main>
}
