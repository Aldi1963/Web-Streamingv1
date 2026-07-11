import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

type SourceValidator = (value: string) => boolean;

function isPrivateIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

function isPrivateIp(address: string) {
  if (isIP(address) === 4) return isPrivateIpv4(address);
  const normalized = address.toLowerCase().split("%")[0];
  return normalized === "::" || normalized === "::1" || normalized.startsWith("fc") ||
    normalized.startsWith("fd") || /^fe[89ab]/.test(normalized) || normalized.startsWith("::ffff:");
}

async function assertPublicSource(value: string, allowed: SourceValidator) {
  if (!allowed(value)) throw new Error("Host media tidak diizinkan.");
  const url = new URL(value);
  if (url.username || url.password || url.port) throw new Error("URL media tidak valid.");
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address))) {
    throw new Error("Alamat media tidak diizinkan.");
  }
}

export async function safeMediaFetch(
  source: string,
  allowed: SourceValidator,
  init: RequestInit = {},
  maxRedirects = 3,
) {
  let current = source;
  for (let redirects = 0; redirects <= maxRedirects; redirects++) {
    await assertPublicSource(current, allowed);
    const response = await fetch(current, { ...init, redirect: "manual" });
    if (response.status < 300 || response.status >= 400) return response;
    const location = response.headers.get("location");
    if (!location || redirects === maxRedirects) throw new Error("Redirect media tidak valid.");
    await response.body?.cancel();
    current = new URL(location, current).toString();
  }
  throw new Error("Terlalu banyak redirect media.");
}
