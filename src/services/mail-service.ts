import "server-only";
import nodemailer from "nodemailer";
import { getSetting } from "@/lib/settings";

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const [host, port, username, password, from] = await Promise.all([
    getSetting("MAIL_HOST"),
    getSetting("MAIL_PORT"),
    getSetting("MAIL_USERNAME"),
    getSetting("MAIL_PASSWORD"),
    getSetting("MAIL_FROM_ADDRESS"),
  ]);
  if (!host || !username || !password || !from) {
    throw new Error("Konfigurasi email belum lengkap.");
  }
  const transport = nodemailer.createTransport({
    host,
    port: Number(port || 587),
    secure: Number(port) === 465,
    auth: { user: username, pass: password },
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
  });
  await transport.sendMail({
    from,
    to: email,
    subject: "Reset password Clipku",
    text: `Buka tautan berikut untuk mengganti password. Tautan berlaku 1 jam:\n\n${resetUrl}`,
    html: `<p>Buka tautan berikut untuk mengganti password. Tautan berlaku 1 jam:</p><p><a href="${resetUrl}">Reset password</a></p>`,
  });
}
