import { NextResponse } from "next/server";
import { auth } from "@/services/auth-service";
import { db } from "@/lib/db";

export async function GET(_request: Request, context: {
  params: Promise<{ invoice: string }>;
}) {
  const user = await auth.currentUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { invoice } = await context.params;
  const payment = await db.payment.findUnique({
    where: { invoiceNumber: invoice },
    select: { userId: true, status: true, paidAt: true },
  });
  if (!payment || payment.userId !== user.id) {
    return NextResponse.json({ message: "Invoice tidak ditemukan." }, { status: 404 });
  }
  return NextResponse.json({
    status: payment.status,
    paidAt: payment.paidAt?.toISOString() || null,
  });
}
