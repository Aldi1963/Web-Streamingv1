import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/services/auth-service";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";

const updateInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("profile"), name: z.string().trim().min(2).max(80), email: z.string().email().max(190) }),
  z.object({ action: z.literal("password"), currentPassword: z.string().min(8), newPassword: z.string().min(8).max(128) }),
  z.object({
    action: z.literal("preferences"),
    autoplay: z.boolean(),
    defaultMuted: z.boolean(),
    playbackSpeed: z.number().min(.5).max(2),
    preferredQuality: z.enum(["auto", "360p", "480p", "720p", "1080p"]),
    emailNotifications: z.boolean(),
  }),
]);

function paymentPurpose(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "subscription";
  return (payload as Record<string, unknown>).purpose === "redeem_code" ? "redeem_code" : "subscription";
}

export async function GET() {
  const user = await auth.currentUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const [profile, subscription, payments, devices, preferences] = await Promise.all([
    db.user.findUnique({ where: { id: user.id }, select: { id: true, name: true, email: true, emailVerifiedAt: true, createdAt: true } }),
    db.subscription.findFirst({
      where: { userId: user.id, status: { in: ["ACTIVE", "TRIAL", "GRACE"] } },
      include: { plan: true },
      orderBy: { expiresAt: "desc" },
    }),
    db.payment.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        invoiceNumber: true,
        provider: true,
        amount: true,
        status: true,
        paidAt: true,
        expiresAt: true,
        createdAt: true,
        payload: true,
        redeemCodes: {
          select: { id: true, status: true, redeemedAt: true, plan: { select: { name: true, durationDays: true } } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.deviceSession.findMany({
      where: { userId: user.id },
      select: { id: true, deviceName: true, browser: true, ip: true, lastActiveAt: true, expiresAt: true },
      orderBy: { lastActiveAt: "desc" },
    }),
    db.userPreference.findUnique({ where: { userId: user.id } }),
  ]);
  return NextResponse.json({
    profile,
    subscription,
    payments: payments.map(payment => ({
      id: payment.id,
      invoiceNumber: payment.invoiceNumber,
      provider: payment.provider,
      amount: payment.amount,
      status: payment.status,
      paidAt: payment.paidAt,
      expiresAt: payment.expiresAt,
      createdAt: payment.createdAt,
      purpose: paymentPurpose(payment.payload),
      redeemCode: payment.redeemCodes[0] ?? null,
    })),
    devices,
    preferences,
  });
}

export async function PATCH(request: Request) {
  try {
    const user = await auth.currentUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const input = updateInput.parse(await request.json());
    if (input.action === "profile") {
      const email = input.email.toLowerCase();
      const duplicate = await db.user.findFirst({ where: { email, id: { not: user.id } }, select: { id: true } });
      if (duplicate) return NextResponse.json({ message: "Email sudah digunakan." }, { status: 409 });
      await db.user.update({
        where: { id: user.id },
        data: { name: input.name, email, ...(email !== user.email ? { emailVerifiedAt: null } : {}) },
      });
      return NextResponse.json({ message: "Profil diperbarui." });
    }
    if (input.action === "password") {
      const record = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
      if (!record || !await bcrypt.compare(input.currentPassword, record.passwordHash)) {
        return NextResponse.json({ message: "Password saat ini salah." }, { status: 422 });
      }
      await db.$transaction([
        db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(input.newPassword, 12) } }),
        db.deviceSession.deleteMany({ where: { userId: user.id } }),
      ]);
      return NextResponse.json({ message: "Password diperbarui. Sesi perangkat lain telah dikeluarkan." });
    }
    const { action: _action, ...preferences } = input;
    await db.userPreference.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...preferences },
      update: preferences,
    });
    return NextResponse.json({ message: "Preferensi disimpan." });
  } catch (error) {
    return apiError(error, { route: "me-account" });
  }
}

export async function DELETE(request: Request) {
  const user = await auth.currentUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { password } = z.object({ password: z.string().min(8) }).parse(await request.json());
  const record = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!record || !await bcrypt.compare(password, record.passwordHash)) {
    return NextResponse.json({ message: "Password salah." }, { status: 422 });
  }
  await db.user.delete({ where: { id: user.id } });
  return NextResponse.json({ message: "Akun dan data terkait telah dihapus." });
}
