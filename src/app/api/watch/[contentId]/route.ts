import { NextResponse } from "next/server";
import { auth } from "@/services/auth-service";
import { watchService } from "@/services/watch-service";
import { apiError } from "@/lib/http";
export async function POST(request:Request,{params}:{params:Promise<{contentId:string}>}){try{const user=await auth.currentUser();const {contentId}=await params;const ep=Number(new URL(request.url).searchParams.get("episode")??1);return NextResponse.json(await watchService.authorize(user?.id??null,contentId,ep),{headers:{"Cache-Control":"private, no-store"}})}catch(e){return apiError(e)}}
