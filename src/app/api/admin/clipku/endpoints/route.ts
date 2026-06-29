import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/services/auth-service";
export async function GET(){const user=await auth.currentUser();if(!user||user.role==="USER")return NextResponse.json({message:"Forbidden"},{status:403});return NextResponse.json(await db.apiEndpoint.findMany({orderBy:[{providerType:"asc"},{providerName:"asc"},{path:"asc"}]}))}
