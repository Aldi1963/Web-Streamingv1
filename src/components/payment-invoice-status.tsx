"use client";

import { useEffect, useState } from "react";

export function PaymentInvoiceStatus({ invoiceNumber, initialStatus }: {
  invoiceNumber: string;
  initialStatus: string;
}) {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    if (["PAID", "FAILED", "EXPIRED", "CANCELLED"].includes(status)) return;
    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/payments/status/${encodeURIComponent(invoiceNumber)}`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const body = await response.json() as {
        status: string;
        purpose?: "subscription" | "redeem_code";
        redeemCode?: { code: string } | null;
      };
      setStatus(body.status);
      if (body.status === "PAID") {
        window.location.assign(`/payment/${encodeURIComponent(invoiceNumber)}?payment=success`);
      }
    }, 4_000);
    return () => window.clearInterval(timer);
  }, [invoiceNumber, status]);

  const paid = status === "PAID";
  const failed = ["FAILED", "EXPIRED", "CANCELLED"].includes(status);
  return <div className={paid ? "invoice-status paid" : failed ? "invoice-status failed" : "invoice-status pending"}>
    <span className="invoice-status-dot"/>
    {paid ? "Pembayaran berhasil" : failed ? "Transaksi gagal" : "Menunggu pembayaran"}
  </div>;
}
