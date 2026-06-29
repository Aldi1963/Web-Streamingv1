"use client";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="shell" style={{ textAlign: "center", paddingTop: 80 }}>
          <span className="success-state icon"><AlertTriangle size={48} /></span>
          <h1 style={{ fontSize: "2rem", margin: "0 0 8px" }}>
            Ups! Ada masalah
          </h1>
          <p style={{ color: "var(--muted)", marginBottom: 20 }}>
            Sistem sedang mengalami gangguan.
          </p>
          <button onClick={reset} className="btn">
            Muat Ulang
          </button>
        </div>
      </body>
    </html>
  );
}
