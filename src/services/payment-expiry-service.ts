import "server-only";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";

export const DEFAULT_PAYMENT_TIMEOUT_MINUTES = 60;

export async function paymentTimeoutMinutes() {
  const raw = await getSetting("PAYMENT_TIMEOUT_MINUTES");
  const minutes = Number.parseInt(raw || "", 10);
  if (!Number.isFinite(minutes)) return DEFAULT_PAYMENT_TIMEOUT_MINUTES;
  return Math.min(24 * 60, Math.max(5, minutes));
}

export async function paymentExpiresAt(from = new Date()) {
  const minutes = await paymentTimeoutMinutes();
  return new Date(from.getTime() + minutes * 60_000);
}

export async function expirePendingPayments(now = new Date()) {
  const timeout = await paymentTimeoutMinutes();
  const fallbackCreatedBefore = new Date(now.getTime() - timeout * 60_000);
  return db.payment.updateMany({
    where: {
      status: "PENDING",
      OR: [
        { expiresAt: { lte: now } },
        { expiresAt: null, createdAt: { lte: fallbackCreatedBefore } },
      ],
    },
    data: {
      status: "FAILED",
      verifiedAt: now,
    },
  });
}
