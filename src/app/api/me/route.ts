import { NextResponse } from "next/server";
import { auth } from "@/services/auth-service";
export async function GET(){const user=await auth.currentUser();return NextResponse.json(user??{message:"Unauthorized"},{status:user?200:401})}
