import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";

export const settingDefinitions = {
  SITE_NAME: { sensitive: false, fallback: "Clipku Streaming" },
  SITE_DESCRIPTION: { sensitive: false, fallback: "Streaming drama pilihan di Clipku" },
  SEO_DEFAULT_IMAGE: { sensitive: false },
  SEO_INDEXING: { sensitive: false, fallback: "enabled" },
  PAYMENT_PROVIDER: { sensitive: false, fallback: "pakasir" },
  PAKASIR_API_KEY: { sensitive: true },
  PAKASIR_SLUG: { sensitive: false },
  MIDTRANS_SERVER_KEY: { sensitive: true },
  MIDTRANS_CLIENT_KEY: { sensitive: false },
  XENDIT_SECRET_KEY: { sensitive: true },
  MAIL_HOST: { sensitive: false },
  MAIL_PORT: { sensitive: false, fallback: "587" },
  MAIL_USERNAME: { sensitive: false },
  MAIL_PASSWORD: { sensitive: true },
  MAIL_FROM_ADDRESS: { sensitive: false },
  CLOUDFLARE_TURNSTILE_SITE_KEY: { sensitive: false },
  CLOUDFLARE_TURNSTILE_SECRET_KEY: { sensitive: true },
  CRON_SECRET: { sensitive: true },
} as const;

export type SettingKey = keyof typeof settingDefinitions;

function encryptionKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET minimal 32 karakter.");
  return createHash("sha256").update(secret).digest();
}

function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

function decrypt(value: string) {
  const [iv, tag, encrypted] = value.split(".").map((part) => Buffer.from(part, "base64url"));
  if (!iv || !tag || !encrypted) throw new Error("Format setting terenkripsi tidak valid.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export async function getSetting(key: SettingKey) {
  const definition = settingDefinitions[key];
  const row = await db.appSetting.findUnique({ where: { key } });
  if (row?.value) return row.encrypted ? decrypt(row.value) : row.value;
  return process.env[key] || ("fallback" in definition ? definition.fallback : undefined);
}

export async function saveSetting(key: SettingKey, value: string, updatedById: string) {
  const sensitive = settingDefinitions[key].sensitive;
  const storedValue = value ? (sensitive ? encrypt(value) : value) : null;
  return db.appSetting.upsert({
    where: { key },
    create: { key, value: storedValue, encrypted: sensitive, updatedById },
    update: { value: storedValue, encrypted: sensitive, updatedById },
  });
}

export async function listSafeSettings() {
  const rows = await db.appSetting.findMany();
  const stored = new Map(rows.map((row) => [row.key, row]));
  return Object.entries(settingDefinitions).map(([key, definition]) => {
    const row = stored.get(key);
    const envValue = process.env[key];
    const configured = Boolean(row?.value || envValue);
    return {
      key,
      sensitive: definition.sensitive,
      configured,
      value: definition.sensitive ? "" : (row?.value || envValue || ("fallback" in definition ? definition.fallback : "")),
    };
  });
}
