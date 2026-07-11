import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { createRedeemCode } from "@/services/redeem-code-service";

export function subscriptionWindow(now: Date, currentExpiry: Date | null, durationDays: number) {
  const startsAt = currentExpiry && currentExpiry > now ? currentExpiry : now;
  return { startsAt, expiresAt: new Date(startsAt.getTime() + durationDays * 86_400_000) };
}

function jsonObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export async function activatePayment(paymentId: string, options: {
  paidAt?: Date;
  verifiedAt?: Date;
  providerReference?: string | null;
  payload?: Prisma.InputJsonValue;
  admin?: { id: string; reason: string };
}) {
  const now = options.verifiedAt || new Date();
  return db.$transaction(async tx => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new Error("Pembayaran tidak ditemukan.");
    if (!payment.planId) throw new Error("Paket pembayaran tidak valid.");
    if (payment.status === "PAID") return { activated: false, paymentId };
    const plan = await tx.plan.findUnique({ where: { id: payment.planId } });
    if (!plan) throw new Error("Paket pembayaran tidak ditemukan.");
    const payload = jsonObject(payment.payload);
    const nextPayload = options.payload
      ? { ...payload, ...jsonObject(options.payload) }
      : undefined;
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: { not: "PAID" } },
      data: {
        status: "PAID",
        paidAt: options.paidAt || now,
        verifiedAt: now,
        providerReference: options.providerReference,
        ...(nextPayload ? { payload: nextPayload as Prisma.InputJsonValue } : {}),
      },
    });
    if (!claimed.count) return { activated: false, paymentId };
    if (payload.purpose === "redeem_code") {
      const code = await createRedeemCode(tx, { buyerId: payment.userId, planId: plan.id, paymentId: payment.id });
      return { activated: true, paymentId, userId: payment.userId, planId: plan.id, redeemCode: code };
    }
    const current = await tx.subscription.findFirst({
      where: { userId: payment.userId, status: { in: ["ACTIVE","TRIAL","GRACE"] }, expiresAt: { gt: now } },
      orderBy: { expiresAt: "desc" },
    });
    if (current?.planId === plan.id) {
      const window = subscriptionWindow(now, current.expiresAt, plan.durationDays);
      await tx.subscription.update({ where: { id: current.id }, data: { status: "ACTIVE", expiresAt: window.expiresAt } });
    } else {
      if (current) await tx.subscription.update({ where: { id: current.id }, data: { status: "CANCELLED" } });
      const window = subscriptionWindow(now, null, plan.durationDays);
      await tx.subscription.create({ data: { userId: payment.userId, planId: plan.id, status: "ACTIVE", ...window } });
    }
    if (options.admin) await tx.adminAuditLog.create({
      data: { adminId: options.admin.id, action: "PAYMENT_MANUAL_ACTIVATE", entityType: "Payment", entityId: payment.id, detail: { reason: options.admin.reason, planId: plan.id } },
    });
    return { activated: true, paymentId, userId: payment.userId, planId: plan.id };
  });
}
