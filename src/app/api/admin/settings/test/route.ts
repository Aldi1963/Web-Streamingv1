import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/services/auth-service";
import { getSetting } from "@/lib/settings";

export async function POST(request: Request) {
  const user = await auth.currentUser();
  if (!user || !["SUPER_ADMIN","ADMIN"].includes(user.role)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  const { target } = z.object({ target: z.enum(["email","security","payment"]) }).parse(await request.json());
  if (target === "email") {
    const [host,port,username,password,from] = await Promise.all([getSetting("MAIL_HOST"),getSetting("MAIL_PORT"),getSetting("MAIL_USERNAME"),getSetting("MAIL_PASSWORD"),getSetting("MAIL_FROM_ADDRESS")]);
    if (!host || !username || !password || !from) return NextResponse.json({ message: "Konfigurasi SMTP belum lengkap." }, { status: 422 });
    try {
      const transport = nodemailer.createTransport({ host, port: Number(port||587), secure: Number(port)===465, auth: { user: username, pass: password }, connectionTimeout: 8000, greetingTimeout: 8000 });
      await transport.verify();
      return NextResponse.json({ message: "Koneksi dan autentikasi SMTP berhasil." });
    } catch (error) {
      return NextResponse.json({ message: `SMTP gagal: ${error instanceof Error ? error.message : "koneksi ditolak"}` }, { status: 502 });
    }
  }
  if (target === "security") {
    const secret = await getSetting("CLOUDFLARE_TURNSTILE_SECRET_KEY");
    if (!secret) return NextResponse.json({ message: "Turnstile secret belum dikonfigurasi." }, { status: 422 });
    const form = new FormData(); form.set("secret",secret); form.set("response","configuration-test");
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",body:form,signal:AbortSignal.timeout(8000)});
    const result = await response.json() as { "error-codes"?: string[] };
    if (result["error-codes"]?.includes("invalid-input-secret")) return NextResponse.json({ message: "Turnstile secret tidak valid." }, { status: 422 });
    return NextResponse.json({ message: "Cloudflare menerima secret; challenge browser diperlukan untuk pengujian penuh." });
  }
  const provider = await getSetting("PAYMENT_PROVIDER");
  const complete = provider === "aldiqris"
    ? Boolean(await getSetting("ALDIQRIS_API_KEY"))
    : provider === "pakasir"
    ? Boolean(await getSetting("PAKASIR_API_KEY") && await getSetting("PAKASIR_SLUG"))
    : provider === "midtrans"
      ? Boolean(await getSetting("MIDTRANS_SERVER_KEY") && await getSetting("MIDTRANS_CLIENT_KEY"))
      : Boolean(await getSetting("XENDIT_SECRET_KEY"));
  return NextResponse.json({ message: complete ? `Kredensial ${provider} lengkap. Verifikasi transaksi dilakukan saat webhook masuk.` : `Kredensial ${provider} belum lengkap.` }, { status: complete ? 200 : 422 });
}
