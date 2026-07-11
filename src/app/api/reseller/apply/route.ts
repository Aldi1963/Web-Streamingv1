import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/services/auth-service";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";

const inputSchema = z.object({
  businessName: z.string().trim().min(2).max(80),
  contact: z.string().trim().min(5).max(80),
  channel: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
});

export async function GET() {
  const user = await auth.currentUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const application = await db.resellerApplication.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ application });
}

export async function POST(request: Request) {
  const user = await auth.currentUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  try {
    const activeReseller = await db.voucherReseller.findFirst({ where: { ownerId: user.id, isActive: true }, select: { id: true } });
    if (activeReseller) return NextResponse.json({ message: "Akun Anda sudah terdaftar sebagai reseller aktif." }, { status: 409 });
    const pending = await db.resellerApplication.findFirst({ where: { userId: user.id, status: "PENDING" }, select: { id: true } });
    if (pending) return NextResponse.json({ message: "Pengajuan Anda masih menunggu review admin." }, { status: 409 });
    const data = inputSchema.parse(await request.json());
    const application = await db.resellerApplication.create({
      data: {
        userId: user.id,
        businessName: data.businessName,
        contact: data.contact,
        channel: data.channel || null,
        note: data.note || null,
      },
    });
    return NextResponse.json({ message: "Pengajuan reseller dikirim.", application });
  } catch (error) {
    return apiError(error, { route: "reseller-apply" });
  }
}
