import { createHash, createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getSetting } from "@/lib/settings";
import { activatePayment } from "@/services/payment-activation-service";

function text(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
}

function paidStatus(value: string | undefined) {
  return Boolean(value && ["paid", "success", "settlement", "completed", "berhasil", "lunas"].includes(value.toLowerCase()));
}

function expectedSignature(invoiceNumber: string, paymentId: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET minimal 32 karakter.");
  return createHash("sha256").update(`${invoiceNumber}:${paymentId}:${secret}`).digest("hex");
}

function safeCompareHex(received: string | null, expected: string) {
  if (!received || !/^[a-f0-9]{64}$/i.test(received)) return false;
  const left = Buffer.from(received, "hex");
  const right = Buffer.from(expected, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

async function validWebhookSignature(rawBody: string, requestSignature: string | null, querySignature: string | null, invoiceNumber: string, paymentId: string) {
  if (requestSignature) {
    const apiKey = await getSetting("ALDIQRIS_API_KEY");
    if (!apiKey) return false;
    const expected = createHmac("sha256", apiKey).update(rawBody).digest("hex");
    return safeCompareHex(requestSignature, expected);
  }
  return safeCompareHex(querySignature, expectedSignature(invoiceNumber, paymentId));
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const rawBody = await request.text();
    const event = JSON.parse(rawBody) as Record<string, unknown>;
    const invoiceNumber = text(event, ["order_id", "orderId", "invoice", "invoiceNumber", "merchant_ref", "reference"]);
    if (!invoiceNumber) return NextResponse.json({ message: "Invoice tidak valid." }, { status: 422 });

    const payment = await db.payment.findUnique({ where: { invoiceNumber } });
    if (!payment || payment.provider !== "aldiqris") {
      return NextResponse.json({ message: "Transaksi tidak ditemukan." }, { status: 404 });
    }
    const signatureOk = await validWebhookSignature(
      rawBody,
      request.headers.get("x-signature"),
      url.searchParams.get("sig"),
      invoiceNumber,
      payment.id,
    );
    if (!signatureOk) {
      return NextResponse.json({ message: "Signature webhook tidak valid." }, { status: 401 });
    }

    const amount = Number(text(event, ["amount", "nominal", "total", "gross_amount"]) ?? Number(payment.amount));
    if (Number.isFinite(amount) && amount > 0 && amount !== Number(payment.amount)) {
      return NextResponse.json({ message: "Nominal transaksi tidak sesuai." }, { status: 400 });
    }

    const status = text(event, ["status", "payment_status", "transaction_status"]);
    if (!paidStatus(status)) {
      return NextResponse.json({ message: "Pembayaran belum berstatus lunas." }, { status: 409 });
    }

    await activatePayment(payment.id, {
      paidAt: new Date(),
      verifiedAt: new Date(),
      providerReference: text(event, ["reference", "trx_id", "transaction_id", "payment_id"]),
      payload: { webhook: event as Prisma.InputJsonObject },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, { route: "aldiqris-webhook" });
  }
}
