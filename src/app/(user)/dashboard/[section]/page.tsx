import { auth } from "@/services/auth-service";
import { redirect, notFound } from "next/navigation";
const allowed=["profile","subscription","payments","invoices","watchlist","favorites","devices"];
export default async function DashboardSection({params}:{params:Promise<{section:string}>}){const {section}=await params;if(!allowed.includes(section))notFound();const user=await auth.currentUser();if(!user)redirect("/login");return <main className="shell"><h1>{section.replace("-"," ")}</h1><div className="panel muted">Modul {section} siap terhubung ke data akun {user.email}.</div></main>}
