import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? "development-secret-change-this-now-32");

export class AuthService {
  async register(name: string, email: string, password: string) {
    return db.user.create({ data: { name, email: email.toLowerCase(), passwordHash: await bcrypt.hash(password, 12) } });
  }
  async login(email: string, password: string) {
    const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new Error("Email atau password salah.");
    const token = await new SignJWT({ role: user.role }).setProtectedHeader({ alg: "HS256" }).setSubject(user.id).setExpirationTime("7d").sign(secret);
    (await cookies()).set("clipku_session", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 604800, path: "/" });
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }
  async currentUser() {
    const token = (await cookies()).get("clipku_session")?.value;
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(token, secret);
      return db.user.findUnique({ where: { id: payload.sub! }, select: { id: true, name: true, email: true, role: true } });
    } catch { return null; }
  }
  async logout() { (await cookies()).delete("clipku_session"); }
}
export const auth = new AuthService();
