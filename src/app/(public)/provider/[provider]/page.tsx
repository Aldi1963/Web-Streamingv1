import { ContentGrid } from "@/components/content-grid";
import { db } from "@/lib/db";
export default async function Provider({params}:{params:Promise<{provider:string}>}){const {provider}=await params;const items=await db.content.findMany({where:{providerSlug:provider,isActive:true},take:40}).catch(()=>[]);return <main className="shell"><h1>Provider: {provider}</h1><ContentGrid title="Konten Provider" items={items}/></main>}
