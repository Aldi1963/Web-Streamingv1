import { NextResponse } from "next/server";
import { apiRateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { authenticateReseller } from "@/services/reseller-voucher-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ externalRef: string }> },
) {
  const limited = await apiRateLimit(request);
  if (limited) return limited;

  const reseller = await authenticateReseller(request);
  if (!reseller) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { externalRef } = await params;
  const order = await db.resellerVoucherOrder.findUnique({
    where: { resellerId_externalRef: { resellerId: reseller.id, externalRef } },
    include: {
      plan: { select: { id: true, slug: true, name: true, price: true, durationDays: true } },
      redeemCodes: {
        select: { code: true, status: true, redeemedAt: true, expiresAt: true, codePreview: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!order) return NextResponse.json({ message: "Order tidak ditemukan." }, { status: 404 });
  return NextResponse.json({
    order: {
      id: order.id,
      externalRef: order.externalRef,
      status: order.status,
      quantity: order.quantity,
      amount: order.amount,
      createdAt: order.createdAt,
    },
    plan: order.plan,
    vouchers: order.redeemCodes.map(code => ({
      code: code.code,
      codePreview: code.codePreview,
      status: code.status,
      redeemedAt: code.redeemedAt,
      expiresAt: code.expiresAt,
    })),
  });
}
