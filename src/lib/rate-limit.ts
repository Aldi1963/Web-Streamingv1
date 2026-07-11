import { NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 300_000);

export function rateLimit(opts: {
  windowMs?: number;
  max?: number;
  keyFn?: (req: Request) => string;
}) {
  const windowMs = opts.windowMs ?? 60_000;
  const max = opts.max ?? 30;
  const keyFn =
    opts.keyFn ??
    ((req: Request) =>
      req.headers.get("cf-connecting-ip")?.trim() ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown");

  return async function check(req: Request) {
    const key = keyFn(req);
    const now = Date.now();
    let entry = store.get(key);

    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    entry.count++;

    const headers = new Headers();
    headers.set("X-RateLimit-Limit", String(max));
    headers.set("X-RateLimit-Remaining", String(Math.max(0, max - entry.count)));
    headers.set("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      return NextResponse.json(
        { message: "Terlalu banyak permintaan. Coba lagi nanti." },
        { status: 429, headers }
      );
    }

    return null; // allow
  };
}

// Auth-specific: more aggressive
export const authRateLimit = rateLimit({
  windowMs: 60_000, // 1 minute
  max: 10, // 10 attempts per minute per IP
});

// General API: moderate
export const apiRateLimit = rateLimit({
  windowMs: 60_000,
  max: 60,
});

// Admin: lenient
export const adminRateLimit = rateLimit({
  windowMs: 60_000,
  max: 120,
});

export const redeemRateLimit = rateLimit({
  windowMs: 60_000,
  max: 8,
});
