"use client";

import { useEffect, useRef, useState } from "react";

type PaymentButtonProps = {
  planId: string;
  autoStart?: boolean;
  label?: string;
  purpose?: "subscription" | "redeem_code";
};

export function PaymentButton({ planId, autoStart = false, label = "Bayar dengan QRIS", purpose = "subscription" }: PaymentButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const started = useRef(false);

  async function checkout() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planId, method: "qris", purpose }),
      });
      const body = await response.json() as { paymentUrl?: string; message?: string };
      if (response.status === 401) {
        location.assign(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
        return;
      }
      if (!response.ok || !body.paymentUrl) throw new Error(body.message || "Gagal membuat pembayaran.");
      location.assign(body.paymentUrl);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Gagal membuat pembayaran.");
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!autoStart || started.current) return;
    started.current = true;
    void checkout();
  }, [autoStart]);

  return (
    <>
      <button className="btn" type="button" onClick={checkout} disabled={busy}>
        {busy ? "Menyiapkan QRIS..." : label}
      </button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </>
  );
}
