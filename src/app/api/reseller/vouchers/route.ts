import { NextResponse } from "next/server";
import { z } from "zod";
import { apiRateLimit } from "@/lib/rate-limit";
import { authenticateReseller, createResellerVoucherOrder } from "@/services/reseller-voucher-service";

const input = z.object({
  planId: z.string().min(1).optional(),
  planSlug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  quantity: z.number().int().min(1).max(50),
  externalRef: z.string().trim().min(3).max(120).regex(/^[A-Za-z0-9._:-]+$/),
  expiresInDays: z.number().int().min(1).max(3650).optional().nullable(),
}).refine(data => Boolean(data.planId || data.planSlug), {
  message: "planId atau planSlug wajib diisi.",
  path: ["planId"],
});

function statusForError(message: string) {
  if (message.includes("Saldo")) return 402;
  if (message.includes("Paket")) return 404;
  return 422;
}

export async function POST(request: Request) {
  const limited = await apiRateLimit(request);
  if (limited) return limited;

  const reseller = await authenticateReseller(request);
  if (!reseller) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const data = input.parse(await request.json());
    const result = await createResellerVoucherOrder({
      resellerId: reseller.id,
      buyerId: reseller.ownerId,
      planId: data.planId,
      planSlug: data.planSlug,
      quantity: data.quantity,
      externalRef: data.externalRef,
      expiresInDays: data.expiresInDays ?? null,
    });

    return NextResponse.json({
      success: true,
      idempotent: !result.created,
      order: {
        id: result.order.id,
        externalRef: result.order.externalRef,
        status: result.order.status,
        quantity: result.order.quantity,
        amount: result.order.amount,
        createdAt: result.order.createdAt,
      },
      plan: result.order.plan,
      vouchers: result.codes.map(code => ({
        code,
        durationDays: result.order.plan.durationDays,
      })),
    }, { status: result.created ? 201 : 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Input tidak valid.", issues: error.flatten() }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Gagal membuat voucher.";
    return NextResponse.json({ message }, { status: statusForError(message) });
  }
}
