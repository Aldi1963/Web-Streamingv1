import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { apiError } from "@/lib/http";
import { activatePayment } from "@/services/payment-activation-service";
import type { Prisma } from "@prisma/client";

const webhook = z.object({
  transaction_status: z.string(),
  transaction_id: z.string().min(1),
  order_id: z.string().min(1),
  gross_amount: z.union([z.string(), z.number()]),
  transaction_time: z.string().optional(),
}).passthrough();

function validSignature(raw: string, received: string | null, secret: string) {
  if (!received || !/^[a-f0-9]{64}$/i.test(received)) return false;
  const expected = createHmac("sha256", secret).update(raw).digest();
  const actual = Buffer.from(received, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    const apiKey = await getSetting("ALDIQRIS_API_KEY");
    if (!apiKey || !validSignature(raw, request.headers.get("x-signature"), apiKey)) {
      return NextResponse.json({ message: "Signature webhook tidak valid." }, { status: 403 });
    }
    const event = webhook.parse(JSON.parse(raw));
    if (event.transaction_status.toLowerCase() !== "settlement") {
      return NextResponse.json({ ok: true, ignored: true });
    }
    const payment = await db.payment.findUnique({ where: { invoiceNumber: event.order_id } });
    if (!payment || payment.provider !== "aldiqris") {
      return NextResponse.json({ message: "Transaksi tidak ditemukan." }, { status: 404 });
    }
    if (Number(event.gross_amount) !== Number(payment.amount)) {
      return NextResponse.json({ message: "Nominal transaksi tidak sesuai." }, { status: 400 });
    }
    await activatePayment(payment.id, {
      paidAt: event.transaction_time ? new Date(event.transaction_time.replace(" ", "T") + "+07:00") : new Date(),
      verifiedAt: new Date(),
      providerReference: event.transaction_id,
      payload: event as Prisma.InputJsonObject,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, { route: "aldiqris-webhook" });
  }
}
