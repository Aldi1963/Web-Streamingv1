import "server-only";
import { getSetting } from "@/lib/settings";
import type { Prisma } from "@prisma/client";

type JsonObject = Prisma.InputJsonObject;

async function credentials() {
  const [apiKey, configuredBaseUrl] = await Promise.all([
    getSetting("CLIPKU_PAY_API_KEY"),
    getSetting("CLIPKU_PAY_BASE_URL"),
  ]);
  if (!apiKey) throw new Error("Konfigurasi Pay Clipku belum lengkap.");
  const baseUrl = (configuredBaseUrl || "https://pay.clipku.com/api").replace(/\/+$/, "");
  return { apiKey, baseUrl };
}

function isV1Api(baseUrl: string) {
  return /\/api\/v1\/?$/i.test(baseUrl);
}

function actionUrl(baseUrl: string, action: string) {
  const url = new URL(baseUrl.endsWith("/api") ? `${baseUrl}/` : baseUrl);
  url.searchParams.set("action", action);
  return url.toString();
}

function resourceUrl(baseUrl: string, action: string, path: string) {
  if (!isV1Api(baseUrl)) return actionUrl(baseUrl, action);
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

function findString(value: unknown, keys: string[]): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    if (typeof candidate === "number" && Number.isFinite(candidate)) return String(candidate);
  }
  for (const nested of Object.values(record)) {
    const candidate = findString(nested, keys);
    if (candidate) return candidate;
  }
}

function findPaymentUrl(value: unknown): string | undefined {
  const candidate = findString(value, [
    "payment_url",
    "paymentUrl",
    "checkout_url",
    "checkoutUrl",
    "pay_url",
    "payUrl",
    "paylink",
    "payment_link",
    "redirect_url",
    "redirectUrl",
    "url",
    "link",
  ]);
  return candidate && /^https?:\/\//i.test(candidate) ? candidate : undefined;
}

async function readJson(response: Response, fallbackMessage: string) {
  const raw = await response.text();
  let payload: JsonObject = {};
  try {
    payload = JSON.parse(raw) as JsonObject;
  } catch {
    throw new Error(`Pay Clipku mengembalikan respons yang tidak valid${response.headers.get("content-type") ? ` (${response.headers.get("content-type")})` : ""}.`);
  }
  if (!response.ok) {
    const message = findString(payload, ["message", "error"]) || fallbackMessage;
    throw new Error(message);
  }
  return payload;
}

export async function createClipkuPayPayment(input: {
  orderId: string;
  amount: number;
  description: string;
  webhookUrl: string;
  redirectUrl: string;
  customer?: { name?: string | null; email?: string | null };
}) {
  const { apiKey, baseUrl } = await credentials();
  const response = await fetch(resourceUrl(baseUrl, "create_transaction", "/transactions"), {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      order_id: input.orderId,
      amount: input.amount,
      description: input.description,
      customer_name: input.customer?.name || undefined,
      customer_email: input.customer?.email || undefined,
      customer: {
        name: input.customer?.name || undefined,
        email: input.customer?.email || undefined,
      },
      callback_url: input.webhookUrl,
      webhook_url: input.webhookUrl,
      return_url: input.redirectUrl,
      redirect_url: input.redirectUrl,
      payment_method: "qris",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await readJson(response, "Pay Clipku gagal membuat transaksi.");
  const paymentUrl = findPaymentUrl(payload);
  if (!paymentUrl) throw new Error("Pay Clipku tidak mengembalikan URL pembayaran.");
  return { paymentUrl, payload };
}

export async function verifyClipkuPayPayment(orderId: string) {
  const { apiKey, baseUrl } = await credentials();
  const requestUrl = isV1Api(baseUrl)
    ? new URL(`${baseUrl.replace(/\/+$/, "")}/transactions/${encodeURIComponent(orderId)}`)
    : new URL(actionUrl(baseUrl, "get_transaction"));
  if (!isV1Api(baseUrl)) requestUrl.searchParams.set("order_id", orderId);
  const response = await fetch(requestUrl.toString(), {
    headers: { authorization: `Bearer ${apiKey}`, accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  return readJson(response, "Pay Clipku gagal memverifikasi transaksi.");
}

export function clipkuPayText(record: Record<string, unknown>, keys: string[]) {
  return findString(record, keys);
}

export function clipkuPayPaidStatus(value: string | undefined) {
  return Boolean(value && ["paid", "success", "settlement", "completed", "complete", "berhasil", "lunas"].includes(value.toLowerCase()));
}
