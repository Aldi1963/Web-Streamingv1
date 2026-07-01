import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/services/auth-service";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { apiError } from "@/lib/http";

const input = z.object({
  planId: z.string().min(1),
  method: z.string().default("qris"),
});

export async function POST(request: Request) {
  try {
    const user = await auth.currentUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const { planId, method } = input.parse(await request.json());
    if (method !== "qris") {
      return NextResponse.json({ message: "Metode pembayaran belum didukung." }, { status: 422 });
    }
    const activeSubscription = await db.subscription.findFirst({
      where: { userId: user.id, status: { in: ["ACTIVE", "TRIAL", "GRACE"] }, expiresAt: { gt: new Date() } },
      select: { id: true, expiresAt: true },
      orderBy: { expiresAt: "desc" },
    });
    if (activeSubscription) {
      return NextResponse.json({ message: "Langganan aktif masih berjalan. Tunggu masa aktif habis dulu." }, { status: 409 });
    }
    const plan = await db.plan.findFirst({ where: { id: planId, isActive: true } });
    if (!plan) return NextResponse.json({ message: "Paket tidak ditemukan." }, { status: 404 });
    const [project, apiKey] = await Promise.all([
      getSetting("PAKASIR_SLUG"),
      getSetting("PAKASIR_API_KEY"),
    ]);
    if (!project || !apiKey) {
      return NextResponse.json({ message: "Pembayaran belum tersedia." }, { status: 503 });
    }

    const invoiceNumber = `CK-${Date.now()}-${randomBytes(3).toString("hex").toUpperCase()}`;
    const amount = Number(plan.price);
    await db.payment.create({
      data: {
        invoiceNumber,
        userId: user.id,
        planId: plan.id,
        provider: "pakasir",
        amount,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    const appUrl = process.env.APP_URL ?? new URL(request.url).origin;
    const paymentUrl = new URL(`https://app.pakasir.com/pay/${encodeURIComponent(project)}/${amount}`);
    paymentUrl.searchParams.set("order_id", invoiceNumber);
    paymentUrl.searchParams.set("redirect", `${appUrl}/dashboard?payment=${invoiceNumber}`);
    paymentUrl.searchParams.set("qris_only", "1");
    return NextResponse.json({ invoiceNumber, paymentUrl: paymentUrl.toString() });
  } catch (error) {
    return apiError(error, { route: "payment-checkout" });
  }
}
