import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/services/auth-service";
import { db } from "@/lib/db";
import { activatePayment } from "@/services/payment-activation-service";
import { expirePendingPayments } from "@/services/payment-expiry-service";

async function permitted() {
  const user = await auth.currentUser();
  return user && ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"].includes(user.role) ? user : null;
}

export async function GET(request: NextRequest) {
  const user = await permitted();
  if (!user) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  await expirePendingPayments();
  const section = request.nextUrl.searchParams.get("section") || "dashboard";
  const includeSummary = section === "dashboard";
  const summary = includeSummary ? await Promise.all([
    db.user.count(), db.content.count(), db.apiEndpoint.count(), db.payment.count(),
    db.subscription.count({ where: { status: "ACTIVE", expiresAt: { gt: new Date() } } }),
    db.apiSyncLog.count({ where: { status: { not: "SUCCESS" } } }),
  ]).then(([users, contents, endpoints, payments, activeSubscriptions, failedSyncs]) => ({ users, contents, endpoints, payments, activeSubscriptions, failedSyncs })) : null;
  if (section === "users") {
    if (user.role === "CONTENT_MANAGER") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.json({ stats: summary, rows: await db.user.findMany({
      take: 100, orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, role: true, isSuspended: true, emailVerifiedAt: true, createdAt: true,
        _count: { select: { sessions: true, subscriptions: true } } },
    }) });
  }
  if (section === "subscriptions") {
    if (user.role === "CONTENT_MANAGER") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.json({ stats: summary, rows: await db.subscription.findMany({
      take: 100, orderBy: { expiresAt: "desc" },
      select: { id: true, status: true, startsAt: true, expiresAt: true, user: { select: { email: true } }, plan: { select: { name: true } } },
    }) });
  }
  if (section === "devices") {
    if (user.role === "CONTENT_MANAGER") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.json({ stats: summary, rows: await db.deviceSession.findMany({
      take: 100, orderBy: { lastActiveAt: "desc" },
      select: { id: true, deviceName: true, browser: true, ip: true, lastActiveAt: true, expiresAt: true, user: { select: { email: true } } },
    }) });
  }
  if (["payments", "invoices"].includes(section)) {
    if (user.role === "CONTENT_MANAGER") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.json({ stats: summary, rows: await db.payment.findMany({
      take: 100, orderBy: { createdAt: "desc" },
      select: { id: true, invoiceNumber: true, provider: true, amount: true, status: true, paidAt: true, createdAt: true,
        expiresAt: true,
        user: { select: { email: true } } },
    }) });
  }
  if (["contents", "providers", "categories"].includes(section)) return NextResponse.json({
    stats: summary, rows: await db.content.findMany({ take: 100, orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, providerName: true, type: true, isActive: true, isFeatured: true, lastSyncedAt: true,
        _count: { select: { episodes: true } } } }),
  });
  if (section.includes("logs")) return NextResponse.json({
    stats: summary, rows: section === "logs" ? await db.adminAuditLog.findMany({ take: 100, orderBy: { createdAt: "desc" } }) :
      await db.apiLog.findMany({ take: 100, orderBy: { createdAt: "desc" },
        select: { id: true, providerName: true, method: true, url: true, responseStatus: true, responseTime: true, errorMessage: true, createdAt: true } }),
  });
  const recentSyncs = includeSummary ? await db.apiSyncLog.findMany({ take: 10, orderBy: { startedAt: "desc" } }) : undefined;
  return NextResponse.json({ stats: summary, ...(recentSyncs ? { recentSyncs } : {}) });
}

export async function PATCH(request: NextRequest) {
  const user = await permitted();
  if (!user) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  const body = await request.json() as { type?: string; id?: string; value?: boolean | string; detail?: string };
  if (!body.id) return NextResponse.json({ message: "ID wajib." }, { status: 400 });
  if (body.type === "content-active") {
    const result = await db.content.update({ where: { id: body.id }, data: { isActive: Boolean(body.value) } });
    await db.adminAuditLog.create({data:{adminId:user.id,action:"CONTENT_ACTIVE",entityType:"Content",entityId:body.id,detail:{value:body.value}}});
    return NextResponse.json({ message: "Status konten diperbarui.", result });
  }
  if (body.type === "content-featured") {
    const result = await db.content.update({ where: { id: body.id }, data: { isFeatured: Boolean(body.value) } });
    await db.adminAuditLog.create({data:{adminId:user.id,action:"CONTENT_FEATURED",entityType:"Content",entityId:body.id,detail:{value:body.value}}});
    return NextResponse.json({ message: "Featured diperbarui.", result });
  }
  if (user.role === "CONTENT_MANAGER") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  if (body.type === "logout-devices") {
    const result = await db.deviceSession.deleteMany({ where: { userId: body.id } });
    await db.adminAuditLog.create({data:{adminId:user.id,action:"LOGOUT_DEVICES",entityType:"User",entityId:body.id,detail:{count:result.count}}});
    return NextResponse.json({ message: `${result.count} sesi perangkat dihapus.` });
  }
  if (body.type === "user-suspended") {
    if (body.id === user.id) return NextResponse.json({ message: "Tidak dapat menonaktifkan akun sendiri." }, { status: 422 });
    const suspended = Boolean(body.value);
    const result = await db.$transaction([
      db.user.update({ where: { id: body.id }, data: { isSuspended: suspended, suspendedAt: suspended ? new Date() : null } }),
      ...(suspended ? [db.deviceSession.deleteMany({ where: { userId: body.id } })] : []),
      db.adminAuditLog.create({data:{adminId:user.id,action:suspended?"USER_SUSPEND":"USER_RESTORE",entityType:"User",entityId:body.id}}),
    ]);
    return NextResponse.json({ message: suspended ? "Akun dinonaktifkan." : "Akun diaktifkan.", result });
  }
  if (body.type === "user-role") {
    if (user.role !== "SUPER_ADMIN") return NextResponse.json({ message: "Hanya SUPER_ADMIN dapat mengubah role." }, { status: 403 });
    const role = String(body.value);
    if (!["USER","SUBSCRIBER","CONTENT_MANAGER","ADMIN"].includes(role) || body.id === user.id) {
      return NextResponse.json({ message: "Perubahan role tidak valid." }, { status: 422 });
    }
    const result = await db.user.update({ where: { id: body.id }, data: { role: role as "USER"|"SUBSCRIBER"|"CONTENT_MANAGER"|"ADMIN" } });
    await db.adminAuditLog.create({data:{adminId:user.id,action:"USER_ROLE",entityType:"User",entityId:body.id,detail:{role}}});
    return NextResponse.json({ message: "Role diperbarui.", result });
  }
  if (body.type === "subscription-cancel") {
    const result = await db.subscription.update({ where: { id: body.id }, data: { status: "CANCELLED" } });
    await db.adminAuditLog.create({data:{adminId:user.id,action:"SUBSCRIPTION_CANCEL",entityType:"Subscription",entityId:body.id}});
    return NextResponse.json({ message: "Langganan dibatalkan.", result });
  }
  if (body.type === "payment-paid") {
    const reason = body.detail?.trim();
    if (!reason || reason.length < 8) return NextResponse.json({message:"Alasan aktivasi manual minimal 8 karakter."},{status:422});
    const result = await activatePayment(body.id,{admin:{id:user.id,reason}});
    return NextResponse.json({message:"Pembayaran ditandai lunas.",result});
  }
  return NextResponse.json({ message: "Aksi tidak dikenal." }, { status: 400 });
}
