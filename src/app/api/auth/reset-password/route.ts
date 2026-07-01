import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { authRateLimit } from "@/lib/rate-limit";
import { hashResetToken } from "@/lib/password-reset";

const input = z.object({
  token: z.string().length(64),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  const limited = await authRateLimit(request);
  if (limited) return limited;
  try {
    const data = input.parse(await request.json());
    const user = await db.user.findFirst({
      where: {
        rememberToken: hashResetToken(data.token),
        rememberTokenExpiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ message: "Token tidak valid atau sudah kedaluwarsa." }, { status: 422 });
    }
    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: {
          passwordHash: await bcrypt.hash(data.password, 12),
          rememberToken: null,
          rememberTokenExpiresAt: null,
        },
      }),
      db.deviceSession.deleteMany({ where: { userId: user.id } }),
    ]);
    return NextResponse.json({ message: "Password berhasil diperbarui. Silakan login kembali." });
  } catch (error) {
    return apiError(error, { route: "reset-password" });
  }
}
