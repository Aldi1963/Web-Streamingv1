import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPakasirPayment } from "@/services/pakasir-service";
import { apiError } from "@/lib/http";
import { activatePayment } from "@/services/payment-activation-service";

const webhook = z.object({
  amount: z.number().positive(),
  order_id: z.string().min(1),
  project: z.string().min(1),
  status: z.string(),
  payment_method: z.string().optional(),
  completed_at: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const event = webhook.parse(await request.json());
    const payment = await db.payment.findUnique({ where: { invoiceNumber: event.order_id } });
    if (!payment || payment.provider !== "pakasir") {
      return NextResponse.json({ message: "Transaksi tidak ditemukan." }, { status: 404 });
    }
    if (Number(payment.amount) !== event.amount) {
      return NextResponse.json({ message: "Nominal transaksi tidak sesuai." }, { status: 400 });
    }

    // Pakasir tidak menandatangani webhook. Verifikasi server-to-server ke
    // Transaction Detail API adalah sumber kebenaran sebelum aktivasi paket.
    const verified = await verifyPakasirPayment(payment.invoiceNumber, Number(payment.amount));
    if (
      !verified ||
      verified.order_id !== payment.invoiceNumber ||
      verified.amount !== Number(payment.amount) ||
      verified.status !== "completed"
    ) {
      return NextResponse.json({ message: "Pembayaran belum terverifikasi." }, { status: 409 });
    }
    if (!payment.planId) return NextResponse.json({ message: "Paket transaksi tidak valid." }, { status: 422 });
    const plan = await db.plan.findUnique({ where: { id: payment.planId } });
    if (!plan) return NextResponse.json({ message: "Paket transaksi tidak ditemukan." }, { status: 422 });

    await activatePayment(payment.id, {
      paidAt: verified.completed_at ? new Date(verified.completed_at) : new Date(),
      verifiedAt: new Date(),
      providerReference: verified.payment_method,
      payload: { webhook: event, verified },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, { route: "pakasir-webhook" });
  }
}
