import { NextResponse } from "next/server";
import { auth } from "@/services/auth-service";
import { clipku } from "@/services/clipku-api-service";
export async function POST(){const user=await auth.currentUser();if(!user||!["SUPER_ADMIN","ADMIN","CONTENT_MANAGER"].includes(user.role))return NextResponse.json({message:"Forbidden"},{status:403});const endpoints=await clipku.scanEndpoints();return NextResponse.json({message:"Dokumentasi berhasil dipindai.",total:endpoints.length,endpoints})}
