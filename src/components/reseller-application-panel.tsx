"use client";

import { CheckCircle2, ChevronDown, Send, Store, XCircle } from "lucide-react";
import { useState } from "react";

type Application = {
  id: string;
  businessName: string;
  contact: string;
  channel: string | null;
  note: string | null;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export function ResellerApplicationPanel({ initialApplication }: { initialApplication: Application | null }) {
  const [application, setApplication] = useState(initialApplication);
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState({ businessName: "", contact: "", channel: "", note: "" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = application?.status === "PENDING";
  const approved = application?.status === "APPROVED";
  const rejected = application?.status === "REJECTED";
  const canApply = !pending && !approved;
  const statusLabel = approved ? "Disetujui" : rejected ? "Ditolak" : pending ? "Direview" : "Belum diajukan";
  const statusText = application
    ? `${application.businessName} - ${new Date(application.createdAt).toLocaleDateString("id-ID")}`
    : "Jual voucher premium dengan saldo reseller dan API partner.";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/reseller/apply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    setBusy(false);
    setMessage(data.message || (response.ok ? "Pengajuan dikirim." : "Gagal mengirim pengajuan."));
    if (!response.ok) return;
    setApplication(data.application);
    setForm({ businessName: "", contact: "", channel: "", note: "" });
    setExpanded(false);
  }

  return (
    <section className="reseller-apply-panel">
      <div className="reseller-apply-summary">
        <span className="reseller-apply-icon"><Store size={18} /></span>
        <div>
          <p className="eyebrow">Partner voucher</p>
          <h2>Ajukan menjadi reseller</h2>
          <small>{statusText}</small>
        </div>
        <span className={`reseller-apply-pill ${application?.status.toLowerCase() ?? "idle"}`}>{statusLabel}</span>
        {canApply ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm reseller-apply-toggle"
            onClick={() => setExpanded(value => !value)}
            aria-expanded={expanded}
          >
            {rejected ? "Ajukan ulang" : "Ajukan"} <ChevronDown size={16} />
          </button>
        ) : null}
      </div>

      {application ? (
        <div className={`reseller-apply-status ${application.status.toLowerCase()}`}>
          {approved ? <CheckCircle2 size={18} /> : rejected ? <XCircle size={18} /> : <Store size={18} />}
          <div>
            <strong>{approved ? "Pengajuan disetujui" : rejected ? "Pengajuan ditolak" : "Sedang direview"}</strong>
            <span>{application.businessName} · {new Date(application.createdAt).toLocaleDateString("id-ID")}</span>
            {application.rejectionReason ? <p>{application.rejectionReason}</p> : null}
          </div>
        </div>
      ) : null}

      {canApply && expanded ? (
        <form className="reseller-apply-form" onSubmit={submit}>
          <label><span>Nama toko / brand</span><input value={form.businessName} onChange={event => setForm({ ...form, businessName: event.target.value })} minLength={2} maxLength={80} required placeholder="Contoh: Clipku Partner Jakarta" /></label>
          <label><span>Kontak aktif</span><input value={form.contact} onChange={event => setForm({ ...form, contact: event.target.value })} minLength={5} maxLength={80} required placeholder="WhatsApp / Telegram / Email" /></label>
          <label><span>Channel jualan</span><input value={form.channel} onChange={event => setForm({ ...form, channel: event.target.value })} maxLength={120} placeholder="Website, toko, komunitas, atau sosial media" /></label>
          <label><span>Catatan</span><textarea value={form.note} onChange={event => setForm({ ...form, note: event.target.value })} maxLength={500} placeholder="Estimasi penjualan, target customer, atau kebutuhan API" /></label>
          <div className="reseller-apply-actions">
            <button className="btn btn-sm" disabled={busy}><Send size={16} /> Kirim pengajuan</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setExpanded(false)}>Tutup</button>
          </div>
        </form>
      ) : pending || approved ? (
        <p className="muted">{approved ? "Admin sudah menyetujui akun reseller Anda. API key diberikan melalui admin." : "Pengajuan baru bisa dikirim lagi setelah admin menyelesaikan review."}</p>
      ) : null}
      {message ? <p className="reseller-apply-message">{message}</p> : null}
    </section>
  );
}
