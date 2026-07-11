import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/services/auth-service";
import { db } from "@/lib/db";
import { createVoucherReseller } from "@/services/reseller-voucher-service";

const createInput = z.object({
  name: z.string().trim().min(2).max(80),
  ownerEmail: z.string().email(),
  initialBalance: z.number().min(0).max(999_999_999).optional(),
});

const patchInput = z.object({
  id: z.string().min(1),
  action: z.enum(["UPDATE_RESELLER", "APPROVE_APPLICATION", "REJECT_APPLICATION"]).default("UPDATE_RESELLER"),
  isActive: z.boolean().optional(),
  addBalance: z.number().positive().max(999_999_999).optional(),
  initialBalance: z.number().min(0).max(999_999_999).optional(),
  rejectionReason: z.string().trim().max(500).optional(),
});

async function admin() {
  const user = await auth.currentUser();
  return user && ["SUPER_ADMIN", "ADMIN"].includes(user.role) ? user : null;
}

export async function GET() {
  const user = await admin();
  if (!user) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const resellers = await db.voucherReseller.findMany({
    select: {
      id: true,
      name: true,
      keyPreview: true,
      balance: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      owner: { select: { id: true, email: true, name: true } },
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const applications = await db.resellerApplication.findMany({
    where: { status: "PENDING" },
    select: {
      id: true,
      businessName: true,
      contact: true,
      channel: true,
      note: true,
      status: true,
      createdAt: true,
      user: { select: { id: true, email: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
  return NextResponse.json({ resellers, applications });
}

export async function POST(request: Request) {
  const user = await admin();
  if (!user) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const data = createInput.parse(await request.json());
  const owner = await db.user.findUnique({ where: { email: data.ownerEmail }, select: { id: true, email: true } });
  if (!owner) return NextResponse.json({ message: "Owner reseller tidak ditemukan." }, { status: 404 });

  const result = await createVoucherReseller({
    name: data.name,
    ownerId: owner.id,
    initialBalance: data.initialBalance ?? 0,
  });
  await db.adminAuditLog.create({
    data: {
      adminId: user.id,
      action: "RESELLER_CREATE",
      entityType: "VoucherReseller",
      entityId: result.reseller.id,
      detail: { name: result.reseller.name, ownerEmail: owner.email, initialBalance: data.initialBalance ?? 0 },
    },
  });
  return NextResponse.json({
    message: "Reseller dibuat. Simpan API key karena tidak akan ditampilkan lagi.",
    reseller: result.reseller,
    apiKey: result.apiKey,
  });
}

export async function PATCH(request: Request) {
  const user = await admin();
  if (!user) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const data = patchInput.parse(await request.json());
  if (data.action === "APPROVE_APPLICATION") {
    const application = await db.resellerApplication.findUnique({
      where: { id: data.id },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!application) return NextResponse.json({ message: "Pengajuan tidak ditemukan." }, { status: 404 });
    if (application.status !== "PENDING") return NextResponse.json({ message: "Pengajuan sudah diproses." }, { status: 409 });
    const result = await createVoucherReseller({
      name: application.businessName,
      ownerId: application.userId,
      initialBalance: data.initialBalance ?? 0,
    });
    await db.resellerApplication.update({
      where: { id: application.id },
      data: {
        status: "APPROVED",
        reviewedById: user.id,
        reviewedAt: new Date(),
        createdResellerId: result.reseller.id,
      },
    });
    await db.adminAuditLog.create({
      data: {
        adminId: user.id,
        action: "RESELLER_APPLICATION_APPROVE",
        entityType: "ResellerApplication",
        entityId: application.id,
        detail: { resellerId: result.reseller.id, ownerEmail: application.user.email, initialBalance: data.initialBalance ?? 0 },
      },
    });
    return NextResponse.json({
      message: "Pengajuan disetujui. Simpan API key karena tidak akan ditampilkan lagi.",
      reseller: result.reseller,
      apiKey: result.apiKey,
    });
  }
  if (data.action === "REJECT_APPLICATION") {
    const application = await db.resellerApplication.update({
      where: { id: data.id },
      data: {
        status: "REJECTED",
        reviewedById: user.id,
        reviewedAt: new Date(),
        rejectionReason: data.rejectionReason || null,
      },
      select: { id: true, userId: true },
    });
    await db.adminAuditLog.create({
      data: {
        adminId: user.id,
        action: "RESELLER_APPLICATION_REJECT",
        entityType: "ResellerApplication",
        entityId: application.id,
        detail: { reason: data.rejectionReason ?? null },
      },
    });
    return NextResponse.json({ message: "Pengajuan ditolak." });
  }

  const updates: Prisma.VoucherResellerUpdateInput = {};
  if (typeof data.isActive === "boolean") updates.isActive = data.isActive;
  if (data.addBalance) updates.balance = { increment: data.addBalance };
  if (!Object.keys(updates).length) return NextResponse.json({ message: "Tidak ada perubahan." }, { status: 400 });

  const reseller = await db.voucherReseller.update({
    where: { id: data.id },
    data: updates,
    select: { id: true, name: true, keyPreview: true, balance: true, isActive: true, updatedAt: true },
  });
  await db.adminAuditLog.create({
    data: {
      adminId: user.id,
      action: "RESELLER_UPDATE",
      entityType: "VoucherReseller",
      entityId: reseller.id,
      detail: { isActive: data.isActive ?? null, addBalance: data.addBalance ?? null },
    },
  });
  return NextResponse.json({ message: "Reseller diperbarui.", reseller });
}
