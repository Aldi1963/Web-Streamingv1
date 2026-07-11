import { NextResponse } from "next/server";
import { ZodError } from "zod";

function logError(error: unknown, context?: Record<string, unknown>) {
  const sensitiveKey = /authorization|cookie|password|secret|token|api[-_]?key|signature/i;
  const safeContext = Object.fromEntries(
    Object.entries(context ?? {}).map(([key, value]) => [key, sensitiveKey.test(key) ? "[REDACTED]" : value]),
  );
  const entry = {
    level: "error",
    timestamp: new Date().toISOString(),
    message: error instanceof Error ? error.message : String(error),
    ...(error instanceof Error ? { stack: error.stack } : {}),
    ...safeContext,
  };
  // In production, send to structured logger (pino/winston).
  // For now, print as JSON for log aggregation tools.
  if (process.env.NODE_ENV === "production") {
    console.error(JSON.stringify(entry));
  } else {
    console.error(error);
  }
}

export function apiError(error: unknown, context?: Record<string, unknown>) {
  logError(error, context);

  if (error instanceof ZodError)
    return NextResponse.json(
      { message: "Input tidak valid.", issues: error.flatten() },
      { status: 422 }
    );

  const message = error instanceof Error ? error.message : "Terjadi kesalahan.";
  const known = [
    "API Clipku sedang bermasalah",
    "User Gratis",
    "Video belum tersedia",
    "Playback URL",
    "langganan",
    "Unauthorized",
    "Email atau password",
    "Akun tidak",
    "Token tidak",
    "Sesi telah",
  ];
  const safe = known.some((part) => message.includes(part))
    ? message
    : "Layanan sedang bermasalah, silakan coba lagi.";
  const isAuth = message.includes("Email atau password") || message.includes("Unauthorized") || message.includes("Token") || message.includes("Sesi");
  return NextResponse.json(
    { message: safe },
    { status: isAuth ? 401 : 500 }
  );
}
