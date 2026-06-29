import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/services/auth-service";
import { apiError } from "@/lib/http";
import { authRateLimit } from "@/lib/rate-limit";

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
    await auth.register(input.name, input.email, input.password);
    return NextResponse.json(
      { message: "Akun berhasil dibuat." },
      { status: 201 }
    );
  } catch (e) {
    return apiError(e, { route: "register" });
  }
}
