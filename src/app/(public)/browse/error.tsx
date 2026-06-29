"use client";
import { Frown } from "lucide-react";

export default function BrowseError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="shell" style={{ textAlign: "center", paddingTop: 80 }}>
      <span className="success-state icon"><Frown size={48} /></span>
      <h2 style={{ fontSize: "1.5rem", margin: "0 0 8px" }}>
        Gagal memuat konten
      </h2>
      <p style={{ color: "var(--muted)", marginBottom: 20 }}>
        {error.message || "Terjadi kesalahan saat mengambil data."}
      </p>
      <button onClick={reset} className="btn">
        Coba Lagi
      </button>
    </div>
  );
}
