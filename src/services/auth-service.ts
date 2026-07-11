import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { createHash } from "crypto";

function authSecret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET minimal 32 karakter.");
  return new TextEncoder().encode(value);
}

export class AuthService {
  async register(name: string, email: string, password: string) {
    return db.user.create({ data: { name, email: email.toLowerCase(), passwordHash: await bcrypt.hash(password, 12) } });
  }
  async login(email: string, password: string, context?: { userAgent?: string | null; ip?: string | null }) {
    const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new Error("Email atau password salah.");
    if (user.isSuspended) throw new Error("Akun dinonaktifkan. Hubungi dukungan.");
    const token = await new SignJWT({ role: user.role }).setProtectedHeader({ alg: "HS256" }).setSubject(user.id).setExpirationTime("7d").sign(authSecret());
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const userAgent = context?.userAgent?.slice(0, 250) || null;
    await db.deviceSession.create({
      data: {
        userId: user.id,
        tokenHash,
        deviceName: userAgent ? (/mobile/i.test(userAgent) ? "Perangkat mobile" : "Desktop") : "Perangkat",
        browser: userAgent,
        ip: context?.ip?.slice(0, 64) || null,
        expiresAt: new Date(Date.now() + 7 * 86_400_000),
      },
    });
    (await cookies()).set("clipku_session", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 604800, path: "/" });
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }
  async currentUser() {
    const token = (await cookies()).get("clipku_session")?.value;
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(token, authSecret());
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const session = await db.deviceSession.findUnique({ where: { tokenHash }, select: { id: true, expiresAt: true } });
      if (!session || session.expiresAt <= new Date()) return null;
      const user = await db.user.findUnique({ where: { id: payload.sub! }, select: { id: true, name: true, email: true, role: true, isSuspended: true } });
      if (!user || user.isSuspended) return null;
      return user;
    } catch { return null; }
  }
  async logout() {
    const store = await cookies();
    const token = store.get("clipku_session")?.value;
    if (token) {
      const tokenHash = createHash("sha256").update(token).digest("hex");
      await db.deviceSession.deleteMany({ where: { tokenHash } });
    }
    store.delete("clipku_session");
  }
}
export const auth = new AuthService();
