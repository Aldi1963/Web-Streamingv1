import Link from "next/link";
import { auth } from "@/services/auth-service";
import { redirect } from "next/navigation";
import { AdminSettingsForm } from "@/components/admin-settings-form";
import { AdminConsole } from "@/components/admin-console";
const links=["dashboard","users","roles","subscriptions","payments","invoices","contents","providers","categories","plans","coupons","api-clipku","api-clipku/documentation","api-clipku/providers","api-clipku/endpoints","api-clipku/tester","api-clipku/mapper","api-clipku/sync","api-clipku/logs","api-clipku/cache","settings","seo","payment-settings","logs","error-logs"];
export default async function Admin({params}:{params:Promise<{section:string[]}>}){
  const user=await auth.currentUser(); if(!user||!["SUPER_ADMIN","ADMIN","CONTENT_MANAGER"].includes(user.role))redirect("/login");
  const section=(await params).section.join("/");
  return <main className="admin"><aside className="sidebar admin-sidebar"><h2>Control Center</h2>{links.map(x=><Link className={section===x?"active":""} key={x} href={`/admin/${x}`}>{x.replaceAll("-"," ")}</Link>)}</aside><section className="shell"><span className="eyebrow">Admin · {user.role}</span><h1>{section.replaceAll("-"," ")}</h1>{["settings","payment-settings"].includes(section)?<AdminSettingsForm />:<AdminConsole section={section}/>}</section></main>
}
