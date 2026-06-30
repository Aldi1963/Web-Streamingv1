import { auth } from "@/services/auth-service";
import { redirect } from "next/navigation";
import { AdminSettingsForm } from "@/components/admin-settings-form";
import { AdminConsole } from "@/components/admin-console";
export default async function Admin({params}:{params:Promise<{section:string[]}>}){
  const user=await auth.currentUser(); if(!user||!["SUPER_ADMIN","ADMIN","CONTENT_MANAGER"].includes(user.role))redirect("/login");
  const section=(await params).section.join("/");
  return <main className="admin admin-context"><section className="shell"><span className="eyebrow">Admin · {user.role}</span><h1>{section.replaceAll("-"," ")}</h1>{["settings","payment-settings"].includes(section)?<AdminSettingsForm />:<AdminConsole section={section}/>}</section></main>
}
