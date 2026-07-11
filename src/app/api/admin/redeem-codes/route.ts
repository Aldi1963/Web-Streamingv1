import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/services/auth-service";
import { db } from "@/lib/db";
import { createRedeemCode } from "@/services/redeem-code-service";

const input = z.object({
  planId: z.string().min(1),
  quantity: z.number().int().min(1).max(100),
  customDurationDays: z.number().int().min(1).max(3650).optional().nullable(),
  expiresInDays: z.number().int().min(1).max(3650).optional().nullable(),
});

async function admin() {
  const user = await auth.currentUser();
  return user && ["SUPER_ADMIN", "ADMIN"].includes(user.role) ? user : null;
}

export async function GET() {
  const user = await admin();
  if (!user) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  const codes = await db.redeemCode.findMany({
    include: {
      plan: { select: { name: true, durationDays: true } },
      buyer: { select: { email: true } },
      redeemer: { select: { email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ codes });
}

export async function POST(request: Request) {
  const user = await admin();
  if (!user) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  const data = input.parse(await request.json());
  const plan = await db.plan.findFirst({ where: { id: data.planId, isActive: true }, select: { id: true, name: true } });
  if (!plan) return NextResponse.json({ message: "Paket aktif tidak ditemukan." }, { status: 404 });
  const expiresAt = data.expiresInDays
    ? new Date(Date.now() + data.expiresInDays * 86_400_000)
    : null;
  const codes = await db.$transaction(async tx => {
    const generated: string[] = [];
    for (let index = 0; index < data.quantity; index++) {
      generated.push(await createRedeemCode(tx, {
        buyerId: user.id,
        planId: plan.id,
        customDurationDays: data.customDurationDays ?? null,
        expiresAt,
      }));
    }
    await tx.adminAuditLog.create({
      data: {
        adminId: user.id,
        action: "REDEEM_CODE_GENERATE",
        entityType: "RedeemCode",
        entityId: plan.id,
        detail: { planId: plan.id, planName: plan.name, quantity: data.quantity, customDurationDays: data.customDurationDays ?? null, expiresAt: expiresAt?.toISOString() ?? null },
      },
    });
    return generated;
  });
  return NextResponse.json({ message: `${codes.length} voucher dibuat.`, codes });
}
