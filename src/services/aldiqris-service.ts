import "server-only";
import { getSetting } from "@/lib/settings";
import type { Prisma } from "@prisma/client";

type AldiQrisPayload = Prisma.InputJsonObject;

async function credentials() {
  const [apiKey, configuredBaseUrl] = await Promise.all([
    getSetting("ALDIQRIS_API_KEY"),
    getSetting("ALDIQRIS_BASE_URL"),
  ]);
  if (!apiKey) throw new Error("Konfigurasi AldiQRIS belum lengkap.");
  const baseUrl = (configuredBaseUrl || "https://aldiqris.pages.dev/api").replace(/\/+$/, "");
  return { apiKey, baseUrl };
}

function findPaymentUrl(value: unknown): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const record = value as Record<string, unknown>;
  for (const key of ["paylink", "payment_url", "paymentUrl", "checkout_url", "checkoutUrl", "payment_link", "url", "link", "redirect_url"]) {
    const candidate = record[key];
    if (typeof candidate === "string" && /^https?:\/\//i.test(candidate)) return candidate;
  }
  for (const nested of Object.values(record)) {
    const candidate = findPaymentUrl(nested);
    if (candidate) return candidate;
  }
}

export async function createAldiQrisPayment(input: {
  orderId: string;
  amount: number;
  name: string;
  webhookUrl: string;
  redirectUrl: string;
  customer?: { name?: string | null; email?: string | null };
}) {
  const { apiKey, baseUrl } = await credentials();
  const response = await fetch(`${baseUrl}/trx`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      order_id: input.orderId,
      amount: input.amount,
      link_name: input.name,
      webhook_url: input.webhookUrl,
      redirect_url: input.redirectUrl,
      customer: {
        name: input.customer?.name || undefined,
        email: input.customer?.email || undefined,
      },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const raw = await response.text();
  let payload: AldiQrisPayload = {};
  try {
    payload = JSON.parse(raw) as AldiQrisPayload;
  } catch {
    throw new Error("AldiQRIS mengembalikan respons yang tidak valid.");
  }
  if (!response.ok) {
    const message = typeof payload.message === "string" ? payload.message : "AldiQRIS gagal membuat transaksi.";
    throw new Error(message);
  }
  const paymentUrl = findPaymentUrl(payload);
  if (!paymentUrl) throw new Error("AldiQRIS tidak mengembalikan URL pembayaran.");
  return { paymentUrl, payload };
}
