import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/services/auth-service";
import { apiError } from "@/lib/http";
import { authRateLimit, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  // Rate limit: prevent registration spam
  const rateLimitCheck = await authRateLimit(request);
  if (rateLimitCheck) return rateLimitCheck;

  try {
    const input = schema.parse(await request.json());
    const emailLimit = rateLimit({
      windowMs: 60 * 60_000,
      max: 3,
      keyFn: () => `register:${input.email.toLowerCase()}`,
    });
    const emailLimitCheck = await emailLimit(request);
    if (emailLimitCheck) return emailLimitCheck;
    await auth.register(input.name, input.email, input.password);
    return NextResponse.json(
      { message: "Akun berhasil dibuat." },
      { status: 201 }
    );
  } catch (e) {
    return apiError(e, { route: "register" });
  }
}
