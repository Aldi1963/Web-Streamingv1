import { NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function GET(_:Request,{params}:{params:Promise<{slug:string}>}){const {slug}=await params;const data=await db.content.findUnique({where:{slug},select:{id:true,title:true,slug:true,description:true,posterUrl:true,bannerUrl:true,providerName:true,type:true,rating:true,episodes:{select:{id:true,episodeNumber:true,title:true}}}});return NextResponse.json(data??{message:"Konten tidak ditemukan."},{status:data?200:404})}
