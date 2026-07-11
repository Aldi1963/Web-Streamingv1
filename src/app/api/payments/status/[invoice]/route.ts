import { NextResponse } from "next/server";
import { auth } from "@/services/auth-service";
import { db } from "@/lib/db";
import { expirePendingPayments } from "@/services/payment-expiry-service";

function payloadPurpose(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "subscription";
  const purpose = (payload as Record<string, unknown>).purpose;
  return purpose === "redeem_code" ? "redeem_code" : "subscription";
}

export async function GET(_request: Request, context: {
  params: Promise<{ invoice: string }>;
}) {
  const user = await auth.currentUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await expirePendingPayments();
  const { invoice } = await context.params;
  const payment = await db.payment.findUnique({
    where: { invoiceNumber: invoice },
    select: {
      userId: true,
      status: true,
      paidAt: true,
      expiresAt: true,
      payload: true,
      redeemCodes: {
        select: {
          id: true,
          code: true,
          status: true,
          plan: { select: { name: true, durationDays: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!payment || payment.userId !== user.id) {
    return NextResponse.json({ message: "Invoice tidak ditemukan." }, { status: 404 });
  }
  const redeemCode = payment.redeemCodes[0];
  return NextResponse.json({
    status: payment.status,
    purpose: payloadPurpose(payment.payload),
    paidAt: payment.paidAt?.toISOString() || null,
    expiresAt: payment.expiresAt?.toISOString() || null,
    redeemCode: redeemCode ? {
      id: redeemCode.id,
      code: redeemCode.code,
      status: redeemCode.status,
      plan: redeemCode.plan,
    } : null,
  });
}
