"use client";

import { useState } from "react";

export function RedeemCodePanel(_props: { initialCodes?: unknown[] } = {}) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function redeem() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/redeem-codes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const body = await response.json();
    setMessage(body.message || (response.ok ? "Kode berhasil dipakai." : "Kode gagal dipakai."));
    setBusy(false);
    if (response.ok) setCode("");
  }

  return (
    <section className="panel redeem-panel">
      <div className="dashboard-section-heading">
        <div><p className="eyebrow">Redeem code</p><h2>Kode langganan</h2></div>
      </div>
      <p className="muted">Masukkan kode yang Anda dapat dari halaman invoice pembelian kode.</p>
      <div className="redeem-form">
        <input value={code} onChange={event => setCode(event.target.value)} placeholder="Masukkan kode redeem" />
        <button className="btn" type="button" onClick={redeem} disabled={busy}>{busy ? "Memproses..." : "Redeem"}</button>
      </div>
      {message && <p className="muted">{message}</p>}
    </section>
  );
}
