import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiRateLimit } from "@/lib/rate-limit";
import { authenticateReseller } from "@/services/reseller-voucher-service";

export async function GET(request: Request) {
  const limited = await apiRateLimit(request);
  if (limited) return limited;

  const reseller = await authenticateReseller(request);
  if (!reseller) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const plans = await db.plan.findMany({
    where: { isActive: true, isTrial: false },
    select: { id: true, slug: true, name: true, price: true, durationDays: true },
    orderBy: { price: "asc" },
  });
  return NextResponse.json({
    reseller: {
      id: reseller.id,
      name: reseller.name,
      balance: reseller.balance,
    },
    plans,
  });
}
