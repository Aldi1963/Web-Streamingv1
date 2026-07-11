import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { authRateLimit, rateLimit } from "@/lib/rate-limit";
import { createResetToken } from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/services/mail-service";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  const rateLimitCheck = await authRateLimit(request);
  if (rateLimitCheck) return rateLimitCheck;

  try {
    const { email } = schema.parse(await request.json());
    const emailLimit = rateLimit({
      windowMs: 60 * 60_000,
      max: 3,
      keyFn: () => `forgot:${email.toLowerCase()}`,
    });
    const emailLimitCheck = await emailLimit(request);
    if (emailLimitCheck) return emailLimitCheck;

    // Always return success to prevent email enumeration
    const user = await db.user.findUnique({ where: { email } });
    if (user) {
      const { token, tokenHash, expiresAt } = createResetToken();

      await db.user.update({
        where: { id: user.id },
        data: { rememberToken: tokenHash, rememberTokenExpiresAt: expiresAt },
      });

      const origin = process.env.APP_URL || new URL(request.url).origin;
      const resetUrl = `${origin.replace(/\/$/, "")}/reset-password?token=${token}`;
      await sendPasswordResetEmail(user.email, resetUrl).catch((error) => {
        console.error(JSON.stringify({
          level: "error",
          route: "forgot-password",
          message: "Gagal mengirim email reset password.",
          error: error instanceof Error ? error.message : String(error),
        }));
      });
    }

    return NextResponse.json({
      message:
        "Jika email terdaftar, link reset password akan dikirim ke inbox Anda.",
    });
  } catch (e) {
    return apiError(e, { route: "forgot-password" });
  }
}
