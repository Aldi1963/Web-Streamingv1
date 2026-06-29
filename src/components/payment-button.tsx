"use client";

import { useState } from "react";

export function PaymentButton({ planId }: { planId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function checkout() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planId, method: "qris" }),
      });
      const body = await response.json() as { paymentUrl?: string; message?: string };
      if (!response.ok || !body.paymentUrl) throw new Error(body.message || "Gagal membuat pembayaran.");
      location.assign(body.paymentUrl);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Gagal membuat pembayaran.");
      setBusy(false);
    }
  }

  return (
    <>
      <button className="btn" type="button" onClick={checkout} disabled={busy}>
        {busy ? "Menyiapkan QRIS…" : "Bayar dengan QRIS"}
      </button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </>
  );
}
