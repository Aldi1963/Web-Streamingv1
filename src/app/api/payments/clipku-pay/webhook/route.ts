import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getSetting } from "@/lib/settings";
import { activatePayment } from "@/services/payment-activation-service";
import { clipkuPayPaidStatus, clipkuPayText, verifyClipkuPayPayment } from "@/services/clipku-pay-service";

function safeCompare(received: string | null, expected: string) {
  if (!received) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function validSignature(rawBody: string, request: Request) {
  const received = request.headers.get("x-signature")
    || request.headers.get("x-paygate-signature")
    || request.headers.get("x-clipku-pay-signature");
  if (!received) return true;
  const secret = await getSetting("CLIPKU_PAY_WEBHOOK_SECRET") || await getSetting("CLIPKU_PAY_API_KEY");
  if (!secret) return false;
  if (safeCompare(received.replace(/^sha256=/i, ""), secret.replace(/^sha256=/i, ""))) return true;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeCompare(received.replace(/^sha256=/i, ""), expected);
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const event = JSON.parse(rawBody) as Record<string, unknown>;
    const invoiceNumber = clipkuPayText(event, ["order_id", "orderId", "invoice", "invoiceNumber", "merchant_ref", "reference"]);
    if (!invoiceNumber) return NextResponse.json({ message: "Invoice tidak valid." }, { status: 422 });

    const payment = await db.payment.findUnique({ where: { invoiceNumber } });
    if (!payment || payment.provider !== "clipku_pay") {
      return NextResponse.json({ message: "Transaksi tidak ditemukan." }, { status: 404 });
    }
    if (!await validSignature(rawBody, request)) {
      return NextResponse.json({ message: "Signature webhook tidak valid." }, { status: 401 });
    }

    const verified = await verifyClipkuPayPayment(payment.invoiceNumber);
    const status = clipkuPayText(verified, ["status", "payment_status", "transaction_status"]);
    const amount = Number(clipkuPayText(verified, ["amount", "nominal", "total", "gross_amount"]) ?? Number(payment.amount));
    const verifiedOrderId = clipkuPayText(verified, ["order_id", "orderId", "invoice", "invoiceNumber", "merchant_ref", "reference"]);
    if (verifiedOrderId && verifiedOrderId !== payment.invoiceNumber) {
      return NextResponse.json({ message: "Invoice verifikasi tidak sesuai." }, { status: 400 });
    }
    if (Number.isFinite(amount) && amount > 0 && amount !== Number(payment.amount)) {
      return NextResponse.json({ message: "Nominal transaksi tidak sesuai." }, { status: 400 });
    }
    if (!clipkuPayPaidStatus(status)) {
      return NextResponse.json({ message: "Pembayaran belum terverifikasi." }, { status: 409 });
    }

    await activatePayment(payment.id, {
      paidAt: new Date(),
      verifiedAt: new Date(),
      providerReference: clipkuPayText(verified, ["reference", "trx_id", "transaction_id", "payment_id", "id"]),
      payload: { webhook: event as Prisma.InputJsonObject, verified },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, { route: "clipku-pay-webhook" });
  }
}
