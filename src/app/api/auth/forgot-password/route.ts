import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { authRateLimit } from "@/lib/rate-limit";
import { randomBytes } from "crypto";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  const rateLimitCheck = await authRateLimit(request);
  if (rateLimitCheck) return rateLimitCheck;

  try {
    const { email } = schema.parse(await request.json());

    // Always return success to prevent email enumeration
    const user = await db.user.findUnique({ where: { email } });
    if (user) {
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 3600_000); // 1 hour

      await db.user.update({
        where: { id: user.id },
        data: { rememberToken: token },
      });

      // TODO: Send email with reset link
      // const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`;
      // await sendEmail(email, "Reset Password Clipku", `Klik link: ${resetUrl}`);

      console.log(
        `[PASSWORD RESET] Token for ${email}: ${token} (expires ${expiresAt.toISOString()})`
      );
    }

    return NextResponse.json({
      message:
        "Jika email terdaftar, link reset password akan dikirim ke inbox Anda.",
    });
  } catch (e) {
    return apiError(e, { route: "forgot-password" });
  }
}
