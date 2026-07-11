import { createHash, randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { createRedeemCode } from "@/services/redeem-code-service";

export function hashResellerApiKey(apiKey: string) {
  return createHash("sha256").update(apiKey.trim()).digest("hex");
}

function previewApiKey(apiKey: string) {
  return `${apiKey.slice(0, 10)}...${apiKey.slice(-6)}`;
}

export function generateResellerApiKey() {
  return `ckrs_live_${randomBytes(24).toString("hex")}`;
}

export async function authenticateReseller(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const apiKeyHash = hashResellerApiKey(match[1]);
  return db.voucherReseller.findFirst({
    where: { apiKeyHash, isActive: true },
    select: {
      id: true,
      name: true,
      ownerId: true,
      balance: true,
      isActive: true,
    },
  });
}

export async function createVoucherReseller(input: {
  name: string;
  ownerId: string;
  initialBalance?: number;
}) {
  const apiKey = generateResellerApiKey();
  const reseller = await db.voucherReseller.create({
    data: {
      name: input.name,
      ownerId: input.ownerId,
      apiKeyHash: hashResellerApiKey(apiKey),
      keyPreview: previewApiKey(apiKey),
      balance: input.initialBalance ?? 0,
    },
    select: {
      id: true,
      name: true,
      ownerId: true,
      keyPreview: true,
      balance: true,
      isActive: true,
      createdAt: true,
    },
  });
  return { reseller, apiKey };
}

export async function createResellerVoucherOrder(input: {
  resellerId: string;
  buyerId: string;
  planId?: string;
  planSlug?: string;
  quantity: number;
  externalRef: string;
  expiresInDays?: number | null;
}) {
  try {
    return await db.$transaction(async tx => {
      const existing = await tx.resellerVoucherOrder.findUnique({
        where: { resellerId_externalRef: { resellerId: input.resellerId, externalRef: input.externalRef } },
        include: { plan: { select: { id: true, name: true, slug: true, durationDays: true, price: true } } },
      });
      if (existing) {
        return {
          order: existing,
          created: false,
          codes: Array.isArray(existing.codes) ? existing.codes as string[] : [],
        };
      }

      const plan = await tx.plan.findFirst({
        where: {
          isActive: true,
          ...(input.planId ? { id: input.planId } : { slug: input.planSlug }),
        },
        select: { id: true, name: true, slug: true, durationDays: true, price: true },
      });
      if (!plan) throw new Error("Paket aktif tidak ditemukan.");

      const amount = new Prisma.Decimal(plan.price).mul(input.quantity);
      const order = await tx.resellerVoucherOrder.create({
        data: {
          resellerId: input.resellerId,
          externalRef: input.externalRef,
          planId: plan.id,
          quantity: input.quantity,
          amount,
          status: "PROCESSING",
          codes: [],
        },
      });

      const debited = await tx.voucherReseller.updateMany({
        where: { id: input.resellerId, isActive: true, balance: { gte: amount } },
        data: { balance: { decrement: amount } },
      });
      if (!debited.count) throw new Error("Saldo reseller tidak cukup.");

      const expiresAt = input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 86_400_000)
        : null;
      const codes: string[] = [];
      for (let index = 0; index < input.quantity; index++) {
        codes.push(await createRedeemCode(tx, {
          buyerId: input.buyerId,
          planId: plan.id,
          resellerOrderId: order.id,
          expiresAt,
        }));
      }

      const completed = await tx.resellerVoucherOrder.update({
        where: { id: order.id },
        data: { status: "COMPLETED", codes },
        include: { plan: { select: { id: true, name: true, slug: true, durationDays: true, price: true } } },
      });
      return { order: completed, created: true, codes };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await db.resellerVoucherOrder.findUnique({
        where: { resellerId_externalRef: { resellerId: input.resellerId, externalRef: input.externalRef } },
        include: { plan: { select: { id: true, name: true, slug: true, durationDays: true, price: true } } },
      });
      if (existing) {
        return {
          order: existing,
          created: false,
          codes: Array.isArray(existing.codes) ? existing.codes as string[] : [],
        };
      }
    }
    throw error;
  }
}
