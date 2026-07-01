import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { authRateLimit } from "@/lib/rate-limit";
import { createResetToken } from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/services/mail-service";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  const rateLimitCheck = await authRateLimit(request);
  if (rateLimitCheck) return rateLimitCheck;

  try {
    const { email } = schema.parse(await request.json());

    // Always return success to prevent email enumeration
    const user = await db.user.findUnique({ where: { email } });
    if (user) {
      const { token, tokenHash, expiresAt } = createResetToken();

      await db.user.update({
        where: { id: user.id },
        data: { rememberToken: tokenHash, rememberTokenExpiresAt: expiresAt },
      });

      const appUrl = process.env.APP_URL ?? new URL(request.url).origin;
      await sendPasswordResetEmail(email, `${appUrl}/reset-password?token=${encodeURIComponent(token)}`);
    }

    return NextResponse.json({
      message:
        "Jika email terdaftar, link reset password akan dikirim ke inbox Anda.",
    });
  } catch (e) {
    return apiError(e, { route: "forgot-password" });
  }
}
