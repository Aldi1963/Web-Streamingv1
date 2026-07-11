import { createHmac, timingSafeEqual } from "node:crypto";

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET minimal 32 karakter.");
  return value;
}

export function signMediaUrl(source: string, expiresAt = Math.floor(Date.now() / 1000) + 300) {
  const signature = createHmac("sha256", secret()).update(`${expiresAt}:${source}`).digest("hex");
  return { signature, expiresAt };
}

export function verifyMediaUrl(source: string, expiresAt: number, signature: string | null) {
  if (!signature || !Number.isInteger(expiresAt) || expiresAt < Math.floor(Date.now() / 1000) || expiresAt > Math.floor(Date.now() / 1000) + 600) return false;
  const expected = createHmac("sha256", secret()).update(`${expiresAt}:${source}`).digest();
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const received = Buffer.from(signature, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}
