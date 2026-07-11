import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/services/auth-service";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { apiError } from "@/lib/http";
import { createAldiQrisPayment } from "@/services/aldiqris-service";
import { createClipkuPayPayment } from "@/services/clipku-pay-service";
import { expirePendingPayments, paymentExpiresAt } from "@/services/payment-expiry-service";

const input = z.object({
  planId: z.string().min(1),
  method: z.string().default("qris"),
  purpose: z.enum(["subscription", "redeem_code"]).default("subscription"),
});

function webhookSignature(invoiceNumber: string, paymentId: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET minimal 32 karakter.");
  return createHash("sha256").update(`${invoiceNumber}:${paymentId}:${secret}`).digest("hex");
}

export async function POST(request: Request) {
  try {
    const user = await auth.currentUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    await expirePendingPayments();
    const { planId, method, purpose } = input.parse(await request.json());
    if (method !== "qris") {
      return NextResponse.json({ message: "Metode pembayaran belum didukung." }, { status: 422 });
    }
    const activeSubscription = purpose === "subscription" ? await db.subscription.findFirst({
      where: { userId: user.id, status: { in: ["ACTIVE", "TRIAL", "GRACE"] }, expiresAt: { gt: new Date() } },
      select: { id: true, expiresAt: true },
      orderBy: { expiresAt: "desc" },
    }) : null;
    if (purpose === "subscription" && activeSubscription) {
      return NextResponse.json({ message: "Langganan aktif masih berjalan. Tunggu masa aktif habis dulu." }, { status: 409 });
    }
    const plan = await db.plan.findFirst({ where: { id: planId, isActive: true } });
    if (!plan) return NextResponse.json({ message: "Paket tidak ditemukan." }, { status: 404 });
    const [paymentProvider, project, apiKey, aldiQrisApiKey, clipkuPayApiKey] = await Promise.all([
      getSetting("PAYMENT_PROVIDER"),
      getSetting("PAKASIR_SLUG"),
      getSetting("PAKASIR_API_KEY"),
      getSetting("ALDIQRIS_API_KEY" as never).catch(() => undefined),
      getSetting("CLIPKU_PAY_API_KEY" as never).catch(() => undefined),
    ]);
    const provider = paymentProvider === "aldiqris" ? "aldiqris" : paymentProvider === "clipku_pay" ? "clipku_pay" : "pakasir";
    if (
      provider === "aldiqris" ? !aldiQrisApiKey :
      provider === "clipku_pay" ? !clipkuPayApiKey :
      (!project || !apiKey)
    ) {
      return NextResponse.json({ message: "Pembayaran belum tersedia." }, { status: 503 });
    }

    const invoiceNumber = `CK-${Date.now()}-${randomBytes(3).toString("hex").toUpperCase()}`;
    const amount = Number(plan.price);
    const appUrl = process.env.APP_URL ?? new URL(request.url).origin;
    const expiresAt = await paymentExpiresAt();
    const paymentRecord = await db.payment.create({
      data: {
        invoiceNumber,
        userId: user.id,
        planId: plan.id,
        provider,
        amount,
        payload: { purpose },
        expiresAt,
      },
    });
    if (provider === "aldiqris") {
      const webhookToken = webhookSignature(invoiceNumber, paymentRecord.id);
      const webhookUrl = new URL(`${appUrl}/api/payments/aldiqris/webhook`);
      webhookUrl.searchParams.set("invoice", invoiceNumber);
      webhookUrl.searchParams.set("sig", webhookToken);
      const payment = await createAldiQrisPayment({
        orderId: invoiceNumber,
        amount,
        name: plan.name,
        webhookUrl: webhookUrl.toString(),
        redirectUrl: `${appUrl}/payment/${invoiceNumber}`,
        customer: { name: user.name, email: user.email },
      });
      await db.payment.update({
        where: { invoiceNumber },
        data: { payload: { purpose, gateway: payment.payload } },
      });
      return NextResponse.json({ invoiceNumber, paymentUrl: `${appUrl}/payment/${invoiceNumber}` });
    }
    if (provider === "clipku_pay") {
      const webhookUrl = `${appUrl}/api/payments/clipku-pay/webhook`;
      const payment = await createClipkuPayPayment({
        orderId: invoiceNumber,
        amount,
        description: plan.name,
        webhookUrl,
        redirectUrl: `${appUrl}/payment/${invoiceNumber}`,
        customer: { name: user.name, email: user.email },
      });
      await db.payment.update({
        where: { invoiceNumber },
        data: { payload: { purpose, gateway: payment.payload } },
      });
      return NextResponse.json({ invoiceNumber, paymentUrl: payment.paymentUrl });
    }
    if (!project) return NextResponse.json({ message: "Pembayaran belum tersedia." }, { status: 503 });
    const paymentUrl = new URL(`https://app.pakasir.com/pay/${encodeURIComponent(project)}/${amount}`);
    paymentUrl.searchParams.set("order_id", invoiceNumber);
    paymentUrl.searchParams.set("redirect", `${appUrl}/payment/${invoiceNumber}`);
    paymentUrl.searchParams.set("qris_only", "1");
    return NextResponse.json({ invoiceNumber, paymentUrl: paymentUrl.toString() });
  } catch (error) {
    return apiError(error, { route: "payment-checkout" });
  }
}
