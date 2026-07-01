"use client";

import { useEffect, useState } from "react";

export function PaymentInvoiceStatus({ invoiceNumber, initialStatus }: {
  invoiceNumber: string;
  initialStatus: string;
}) {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    if (status === "PAID") return;
    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/payments/status/${encodeURIComponent(invoiceNumber)}`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const body = await response.json() as { status: string };
      setStatus(body.status);
      if (body.status === "PAID") window.location.assign("/dashboard?payment=success");
    }, 4_000);
    return () => window.clearInterval(timer);
  }, [invoiceNumber, status]);

  const paid = status === "PAID";
  return <div className={paid ? "invoice-status paid" : "invoice-status pending"}>
    <span className="invoice-status-dot"/>
    {paid ? "Pembayaran berhasil" : "Menunggu pembayaran"}
  </div>;
}
