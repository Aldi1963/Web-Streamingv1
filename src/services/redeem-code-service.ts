import { createHash, randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

function subscriptionWindow(now: Date, currentExpiry: Date | null, durationDays: number) {
  const startsAt = currentExpiry && currentExpiry > now ? currentExpiry : now;
  return { startsAt, expiresAt: new Date(startsAt.getTime() + durationDays * 86_400_000) };
}

export function normalizeRedeemCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function formatRedeemCode(code: string) {
  return normalizeRedeemCode(code).replace(/(.{4})/g, "$1-").replace(/-$/g, "");
}

export function hashRedeemCode(code: string) {
  return createHash("sha256").update(normalizeRedeemCode(code)).digest("hex");
}

export async function createRedeemCode(tx: Prisma.TransactionClient, input: {
  buyerId: string;
  planId: string;
  paymentId?: string;
  resellerOrderId?: string;
  customDurationDays?: number | null;
  expiresAt?: Date | null;
}) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = formatRedeemCode(`CK${randomBytes(9).toString("hex").toUpperCase()}`);
    try {
      await tx.redeemCode.create({
        data: {
          code,
          codeHash: hashRedeemCode(code),
          codePreview: `${code.slice(0, 4)}••••${code.slice(-4)}`,
          buyerId: input.buyerId,
          planId: input.planId,
          customDurationDays: input.customDurationDays ?? undefined,
          paymentId: input.paymentId,
          resellerOrderId: input.resellerOrderId,
          expiresAt: input.expiresAt ?? undefined,
        },
      });
      return code;
    } catch (error) {
      if (attempt === 4) throw error;
    }
  }
  throw new Error("Gagal membuat kode redeem.");
}

export async function redeemCodeForUser(code: string, userId: string) {
  const codeHash = hashRedeemCode(code);
  const now = new Date();
  return db.$transaction(async tx => {
    const redeem = await tx.redeemCode.findUnique({ where: { codeHash }, include: { plan: true } });
    if (!redeem) throw new Error("Kode redeem tidak ditemukan.");
    if (redeem.status !== "AVAILABLE" || redeem.redeemerId) throw new Error("Kode redeem sudah dipakai.");
    if (redeem.expiresAt && redeem.expiresAt <= now) throw new Error("Kode redeem sudah kedaluwarsa.");

    const claimed = await tx.redeemCode.updateMany({
      where: { id: redeem.id, status: "AVAILABLE", redeemerId: null },
      data: { status: "REDEEMED", redeemerId: userId, redeemedAt: now },
    });
    if (!claimed.count) throw new Error("Kode redeem sudah dipakai.");

    const durationDays = redeem.customDurationDays ?? redeem.plan.durationDays;

    const current = await tx.subscription.findFirst({
      where: { userId, status: { in: ["ACTIVE", "TRIAL", "GRACE"] }, expiresAt: { gt: now } },
      orderBy: { expiresAt: "desc" },
    });
    if (current) {
      const window = subscriptionWindow(now, current.expiresAt, durationDays);
      await tx.subscription.update({
        where: { id: current.id },
        data: { planId: redeem.planId, status: "ACTIVE", expiresAt: window.expiresAt },
      });
    } else {
      const window = subscriptionWindow(now, null, durationDays);
      await tx.subscription.create({ data: { userId, planId: redeem.planId, status: "ACTIVE", ...window } });
    }

    return { planName: redeem.plan.name, durationDays };
  });
}
