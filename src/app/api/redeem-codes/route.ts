import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/services/auth-service";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { redeemCodeForUser } from "@/services/redeem-code-service";
import { redeemRateLimit } from "@/lib/rate-limit";

const input = z.object({ code: z.string().min(8).max(64) });

export async function GET() {
  try {
    const user = await auth.currentUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const codes = await db.redeemCode.findMany({
      where: { buyerId: user.id },
      include: { plan: { select: { name: true, durationDays: true } }, redeemer: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ codes });
  } catch (error) {
    return apiError(error, { route: "redeem-codes-list" });
  }
}

export async function POST(request: Request) {
  try {
    const limited = await redeemRateLimit(request);
    if (limited) return limited;
    const user = await auth.currentUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const { code } = input.parse(await request.json());
    const result = await redeemCodeForUser(code, user.id);
    return NextResponse.json({ message: `Kode berhasil dipakai. Paket ${result.planName} aktif.`, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kode redeem gagal dipakai.";
    return NextResponse.json({ message }, { status: 422 });
  }
}
