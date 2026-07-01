import { createHash } from "crypto";
import { SignJWT } from "jose";
import { db } from "../src/lib/db";

async function main() {
  const admin = await db.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  if (!admin) throw new Error("Admin tidak ditemukan.");
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
  const token = await new SignJWT({ role: admin.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(admin.id)
    .setExpirationTime("10m")
    .sign(secret);
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await db.deviceSession.create({
    data: {
      userId: admin.id,
      tokenHash,
      deviceName: "Route diagnostic",
      expiresAt: new Date(Date.now() + 600_000),
    },
  });
  try {
    for (const path of ["/admin/settings", "/api/admin/settings"]) {
      const response = await fetch(`http://127.0.0.1:3000${path}`, {
        headers: { cookie: `clipku_session=${token}` },
        redirect: "manual",
      });
      const body = await response.text();
      console.log(JSON.stringify({ path, status: response.status, body: body.slice(0, 500) }));
    }
  } finally {
    await db.deviceSession.deleteMany({ where: { tokenHash } });
  }
}

main().finally(() => db.$disconnect());
