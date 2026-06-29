import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/services/auth-service";
import { contentService } from "@/services/content-service";
import { apiError } from "@/lib/http";

const schema = z.object({
  providers: z.array(z.string().regex(/^[a-z0-9-]+$/)).min(1).max(20),
  full: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  try {
    const user = await auth.currentUser();
    if (!user || !["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"].includes(user.role))
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    const { providers, full } = schema.parse(await request.json());
    return NextResponse.json({ results: await contentService.syncProviders(providers, { full }) });
  } catch (error) {
    return apiError(error);
  }
}
