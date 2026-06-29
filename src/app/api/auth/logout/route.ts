import { NextResponse } from "next/server";
import { auth } from "@/services/auth-service";
export async function POST(){await auth.logout();return NextResponse.json({message:"Logout berhasil."})}
