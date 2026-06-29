import { NextResponse } from "next/server";
import { clipku } from "@/services/clipku-api-service";
export async function GET(){return NextResponse.json(await clipku.getProviderList())}
