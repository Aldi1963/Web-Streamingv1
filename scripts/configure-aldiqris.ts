import { db } from "../src/lib/db";
import { createCipheriv, createHash, randomBytes } from "crypto";

function encrypt(value: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET minimal 32 karakter.");
  const key = createHash("sha256").update(secret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(part => part.toString("base64url")).join(".");
}

async function save(key: string, value: string, sensitive: boolean, adminId: string) {
  const storedValue = sensitive ? encrypt(value) : value;
  await db.appSetting.upsert({
    where: { key },
    create: { key, value: storedValue, encrypted: sensitive, updatedById: adminId },
    update: { value: storedValue, encrypted: sensitive, updatedById: adminId },
  });
}

async function main() {
  const apiKey = process.env.ALDIQRIS_API_KEY;
  if (!apiKey) throw new Error("ALDIQRIS_API_KEY wajib diisi.");
  const admin = await db.user.findFirst({
    where: { role: "SUPER_ADMIN" },
    select: { id: true },
  });
  if (!admin) throw new Error("Super admin tidak ditemukan.");
  await save("ALDIQRIS_API_KEY", apiKey, true, admin.id);
  await save("ALDIQRIS_BASE_URL", "https://aldiqris.pages.dev/api", false, admin.id);
  await save("PAYMENT_PROVIDER", "aldiqris", false, admin.id);
  console.log(JSON.stringify({ provider: "aldiqris", configured: true }));
}

main().finally(() => db.$disconnect());
