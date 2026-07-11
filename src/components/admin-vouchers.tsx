"use client";

import { CheckCircle2, ClipboardCopy, Gift, RefreshCw, TicketPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Plan = { id: string; name: string; durationDays: number; price: string | number; isActive: boolean };
type RedeemCode = {
  id: string;
  code: string;
  status: string;
  createdAt: string;
  expiresAt: string | null;
  redeemedAt: string | null;
  customDurationDays: number | null;
  plan: { name: string; durationDays: number };
  buyer?: { email: string } | null;
  redeemer?: { email: string } | null;
};

export function AdminVouchers() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [codes, setCodes] = useState<RedeemCode[]>([]);
  const [planId, setPlanId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [expiresInDays, setExpiresInDays] = useState("");
  const [customDurationDays, setCustomDurationDays] = useState("");
  const [generated, setGenerated] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const activePlans = useMemo(() => plans.filter(plan => plan.isActive), [plans]);

  async function load() {
    setLoading(true);
    const [plansResponse, codesResponse] = await Promise.all([
      fetch("/api/admin/plans"),
      fetch("/api/admin/redeem-codes"),
    ]);
    const plansData = await plansResponse.json();
    const codesData = await codesResponse.json();
    if (!plansResponse.ok) throw new Error(plansData.message || "Gagal memuat paket.");
    if (!codesResponse.ok) throw new Error(codesData.message || "Gagal memuat voucher.");
    setPlans(plansData);
    setCodes(codesData.codes || []);
    setPlanId(current => current || plansData.find((plan: Plan) => plan.isActive)?.id || "");
    setLoading(false);
  }

  useEffect(() => {
    load().catch(error => { setMessage(error.message); setLoading(false); });
  }, []);

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setMessage("Kode disalin.");
  }

  async function generate(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setGenerated([]);
    const response = await fetch("/api/admin/redeem-codes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        planId,
        quantity,
        customDurationDays: customDurationDays ? Number(customDurationDays) : null,
        expiresInDays: expiresInDays ? Number(expiresInDays) : null,
      }),
    });
    const data = await response.json();
    setBusy(false);
    setMessage(data.message || (response.ok ? "Voucher dibuat." : "Gagal membuat voucher."));
    if (!response.ok) return;
    setGenerated(data.codes || []);
    await load();
  }

  return <div className="voucher-admin">
    <section className="panel voucher-generator">
      <div className="voucher-head">
        <span><TicketPlus size={19} /></span>
        <div><p className="eyebrow">Voucher</p><h2>Generate kode redeem</h2></div>
      </div>
      <form className="voucher-form" onSubmit={generate}>
        <label><span>Paket</span><select value={planId} onChange={event => setPlanId(event.target.value)} required>
          {activePlans.map(plan => <option value={plan.id} key={plan.id}>{plan.name} · {plan.durationDays} hari</option>)}
        </select></label>
        <label><span>Jumlah</span><input type="number" min={1} max={100} value={quantity} onChange={event => setQuantity(Number(event.target.value))} /></label>
        <label><span>Durasi aktif</span><input type="number" min={1} max={3650} placeholder="Ikut paket" value={customDurationDays} onChange={event => setCustomDurationDays(event.target.value)} /></label>
        <label><span>Kedaluwarsa</span><input type="number" min={1} max={3650} placeholder="Tidak ada" value={expiresInDays} onChange={event => setExpiresInDays(event.target.value)} /></label>
        <button className="btn" disabled={busy || !planId}>{busy ? "Membuat..." : "Generate"}</button>
      </form>
      {generated.length > 0 && <div className="voucher-generated">
        <div className="voucher-generated-head"><CheckCircle2 size={16}/><strong>{generated.length} kode baru</strong><button type="button" onClick={() => copy(generated.join("\n"))}><ClipboardCopy size={15}/>Salin semua</button></div>
        <div className="voucher-code-grid">{generated.map(code => <button type="button" key={code} onClick={() => copy(code)}>{code}</button>)}</div>
      </div>}
    </section>

    <section className="panel voucher-list">
      <div className="voucher-list-head">
        <div><p className="eyebrow">Riwayat voucher</p><h2>100 kode terbaru</h2></div>
        <button className="admin-icon-button" type="button" disabled={loading} onClick={() => load().catch(error => setMessage(error.message))}><RefreshCw size={16} className={loading ? "spin" : ""}/></button>
      </div>
      {loading ? <p className="muted">Memuat voucher...</p> : !codes.length ? <p className="muted">Belum ada voucher.</p> : <div className="voucher-table-wrap"><table><thead><tr><th>Kode</th><th>Paket</th><th>Status</th><th>Redeemer</th><th>Dibuat</th><th>Aksi</th></tr></thead><tbody>
        {codes.map(item => <tr key={item.id}>
          <td><code>{item.code}</code></td>
          <td>{item.plan.name}<small>{item.customDurationDays ?? item.plan.durationDays} hari aktif</small></td>
          <td><span className={`status-badge status-${item.status.toLowerCase()}`}>{item.status}</span>{item.expiresAt && <small>Exp {new Date(item.expiresAt).toLocaleDateString("id-ID")}</small>}</td>
          <td>{item.redeemer?.email || "-"}</td>
          <td>{new Date(item.createdAt).toLocaleString("id-ID")}</td>
          <td><button type="button" onClick={() => copy(item.code)}><ClipboardCopy size={15}/>Salin</button></td>
        </tr>)}
      </tbody></table></div>}
    </section>
    {message && <div className="admin-toast" role="status">{message}<button aria-label="Tutup notifikasi" onClick={() => setMessage("")}>×</button></div>}
  </div>;
}
