import { NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function GET(request:Request){const q=new URL(request.url).searchParams;const data=await db.content.findMany({where:{isActive:true,providerSlug:q.get("provider")??undefined,title:q.get("q")?{contains:q.get("q")!}:undefined},take:Math.min(Number(q.get("limit")??20),100),select:{id:true,title:true,slug:true,posterUrl:true,providerName:true,type:true,rating:true}});return NextResponse.json(data)}
