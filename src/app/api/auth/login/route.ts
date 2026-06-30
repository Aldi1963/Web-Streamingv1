import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/services/auth-service";
import { apiError } from "@/lib/http";
import { authRateLimit } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  // Brute-force protection
  const rateLimitCheck = await authRateLimit(request);
  if (rateLimitCheck) return rateLimitCheck;

  try {
    const input = loginSchema.parse(await request.json());
    const result = await auth.login(input.email, input.password, {
      userAgent: request.headers.get("user-agent"),
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip"),
    });
    return NextResponse.json(result);
  } catch (e) {
    return apiError(e, { route: "login" });
  }
}
