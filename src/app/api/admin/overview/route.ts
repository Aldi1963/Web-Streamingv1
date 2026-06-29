import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/services/auth-service";
import { db } from "@/lib/db";

async function permitted() {
  const user = await auth.currentUser();
  return user && ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"].includes(user.role) ? user : null;
}

export async function GET(request: NextRequest) {
  const user = await permitted();
  if (!user) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  const section = request.nextUrl.searchParams.get("section") || "dashboard";
  const [users, contents, endpoints, payments, activeSubscriptions, failedSyncs] = await Promise.all([
    db.user.count(), db.content.count(), db.apiEndpoint.count(), db.payment.count(),
    db.subscription.count({ where: { status: "ACTIVE", expiresAt: { gt: new Date() } } }),
    db.apiSyncLog.count({ where: { status: { not: "SUCCESS" } } }),
  ]);
  const stats = { users, contents, endpoints, payments, activeSubscriptions, failedSyncs };
  if (section === "users") {
    if (user.role === "CONTENT_MANAGER") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.json({ stats, rows: await db.user.findMany({
      take: 100, orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, role: true, emailVerifiedAt: true, createdAt: true,
        _count: { select: { sessions: true, subscriptions: true } } },
    }) });
  }
  if (["payments", "invoices"].includes(section)) {
    if (user.role === "CONTENT_MANAGER") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.json({ stats, rows: await db.payment.findMany({
      take: 100, orderBy: { createdAt: "desc" },
      select: { id: true, invoiceNumber: true, provider: true, amount: true, status: true, paidAt: true, createdAt: true,
        user: { select: { email: true } } },
    }) });
  }
  if (["contents", "providers", "categories"].includes(section)) return NextResponse.json({
    stats, rows: await db.content.findMany({ take: 100, orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, providerName: true, type: true, isActive: true, isFeatured: true, lastSyncedAt: true,
        _count: { select: { episodes: true } } } }),
  });
  if (section.includes("logs")) return NextResponse.json({
    stats, rows: section === "logs" ? await db.adminAuditLog.findMany({ take: 100, orderBy: { createdAt: "desc" } }) :
      await db.apiLog.findMany({ take: 100, orderBy: { createdAt: "desc" },
        select: { id: true, providerName: true, method: true, url: true, responseStatus: true, responseTime: true, errorMessage: true, createdAt: true } }),
  });
  const recentSyncs = await db.apiSyncLog.findMany({ take: 10, orderBy: { startedAt: "desc" } });
  return NextResponse.json({ stats, recentSyncs });
}

export async function PATCH(request: NextRequest) {
  const user = await permitted();
  if (!user) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  const body = await request.json() as { type?: string; id?: string; value?: boolean };
  if (!body.id) return NextResponse.json({ message: "ID wajib." }, { status: 400 });
  if (body.type === "content-active") {
    const result = await db.content.update({ where: { id: body.id }, data: { isActive: Boolean(body.value) } });
    await db.adminAuditLog.create({data:{adminId:user.id,action:"CONTENT_ACTIVE",entityType:"Content",entityId:body.id,detail:{value:body.value}}});
    return NextResponse.json({ message: "Status konten diperbarui.", result });
  }
  if (body.type === "content-featured") {
    const result = await db.content.update({ where: { id: body.id }, data: { isFeatured: Boolean(body.value) } });
    return NextResponse.json({ message: "Featured diperbarui.", result });
  }
  if (user.role === "CONTENT_MANAGER") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  if (body.type === "logout-devices") {
    const result = await db.deviceSession.deleteMany({ where: { userId: body.id } });
    await db.adminAuditLog.create({data:{adminId:user.id,action:"LOGOUT_DEVICES",entityType:"User",entityId:body.id,detail:{count:result.count}}});
    return NextResponse.json({ message: `${result.count} sesi perangkat dihapus.` });
  }
  if (body.type === "payment-paid") {
    const result = await db.payment.update({where:{id:body.id},data:{status:"PAID",paidAt:new Date()}});
    await db.adminAuditLog.create({data:{adminId:user.id,action:"PAYMENT_MARK_PAID",entityType:"Payment",entityId:body.id}});
    return NextResponse.json({message:"Pembayaran ditandai lunas.",result});
  }
  return NextResponse.json({ message: "Aksi tidak dikenal." }, { status: 400 });
}
