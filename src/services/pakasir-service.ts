import "server-only";
import { getSetting } from "@/lib/settings";

const API_BASE = "https://app.pakasir.com/api";

type PakasirTransaction = {
  amount: number;
  order_id: string;
  project: string;
  status: string;
  payment_method?: string;
  completed_at?: string;
};

async function credentials() {
  const [project, apiKey] = await Promise.all([
    getSetting("PAKASIR_SLUG"),
    getSetting("PAKASIR_API_KEY"),
  ]);
  if (!project || !apiKey) throw new Error("Konfigurasi Pakasir belum lengkap.");
  return { project, apiKey };
}

export async function createPakasirPayment(
  orderId: string,
  amount: number,
  method = "qris",
) {
  const allowed = new Set([
    "qris", "cimb_niaga_va", "bni_va", "sampoerna_va", "bnc_va",
    "maybank_va", "permata_va", "atm_bersama_va", "artha_graha_va", "bri_va",
  ]);
  if (!allowed.has(method)) throw new Error("Metode pembayaran tidak didukung.");
  const { project, apiKey } = await credentials();
  const response = await fetch(`${API_BASE}/transactioncreate/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ project, order_id: orderId, amount, api_key: apiKey }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("Pakasir gagal membuat transaksi.");
  return response.json() as Promise<{ payment: Record<string, unknown> }>;
}

export async function verifyPakasirPayment(orderId: string, amount: number) {
  const { project, apiKey } = await credentials();
  const query = new URLSearchParams({
    project,
    amount: String(amount),
    order_id: orderId,
    api_key: apiKey,
  });
  const response = await fetch(`${API_BASE}/transactiondetail?${query}`, {
    headers: { accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("Pakasir gagal memverifikasi transaksi.");
  const body = await response.json() as { transaction?: PakasirTransaction };
  return body.transaction;
}
