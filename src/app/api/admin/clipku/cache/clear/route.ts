import { NextResponse } from "next/server";
import { auth } from "@/services/auth-service";
import { clipku } from "@/services/clipku-api-service";
export async function POST(){const user=await auth.currentUser();if(!user||!["SUPER_ADMIN","ADMIN"].includes(user.role))return NextResponse.json({message:"Forbidden"},{status:403});return NextResponse.json(await clipku.clearCache())}
