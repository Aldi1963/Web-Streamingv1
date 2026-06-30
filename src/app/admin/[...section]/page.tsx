import { auth } from "@/services/auth-service";
import { redirect } from "next/navigation";
import { AdminSettingsForm } from "@/components/admin-settings-form";
import { AdminConsole } from "@/components/admin-console";
import { AdminLayout } from "@/components/admin-layout";
export default async function Admin({params}:{params:Promise<{section:string[]}>}){
  const user=await auth.currentUser(); if(!user||!["SUPER_ADMIN","ADMIN","CONTENT_MANAGER"].includes(user.role))redirect("/login");
  const section=(await params).section.join("/");
  const title=section==="api-clipku"?"Integrasi API":section==="error-logs"?"Monitoring & Log":section.replaceAll("-"," ");
  return <main className="admin-context"><AdminLayout role={user.role} title={title}>
    {["settings","payment-settings"].includes(section)?<AdminSettingsForm />:<AdminConsole section={section}/>}
  </AdminLayout></main>
}
