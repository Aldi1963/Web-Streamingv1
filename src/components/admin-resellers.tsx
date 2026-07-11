"use client";

import Link from "next/link";
import { CheckCircle2, ClipboardCopy, KeyRound, Plus, RefreshCw, Save, ShieldOff, ShieldCheck, Store, WalletCards, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Reseller = {
  id: string;
  name: string;
  keyPreview: string;
  balance: string | number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  owner: { id: string; email: string; name: string };
  _count: { orders: number };
};

type ResellerApplication = {
  id: string;
  businessName: string;
  contact: string;
  channel: string | null;
  note: string | null;
  status: string;
  createdAt: string;
  user: { id: string; email: string; name: string };
};

const emptyForm = { name: "", ownerEmail: "", initialBalance: 0 };

function money(value: string | number) {
  return `Rp ${Number(value).toLocaleString("id-ID")}`;
}

export function AdminResellers() {
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [applications, setApplications] = useState<ResellerApplication[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [topup, setTopup] = useState<Record<string, string>>({});
  const [approvalBalance, setApprovalBalance] = useState<Record<string, string>>({});
  const [apiKey, setApiKey] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const activeCount = useMemo(() => resellers.filter(item => item.isActive).length, [resellers]);
  const totalBalance = useMemo(() => resellers.reduce((sum, item) => sum + Number(item.balance || 0), 0), [resellers]);
  const totalOrders = useMemo(() => resellers.reduce((sum, item) => sum + Number(item._count?.orders || 0), 0), [resellers]);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/admin/resellers");
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Gagal memuat reseller.");
    setResellers(data.resellers || []);
    setApplications(data.applications || []);
    setLoading(false);
  }

  useEffect(() => {
    load().catch(error => {
      setMessage(error.message);
      setLoading(false);
    });
  }, []);

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setMessage("Disalin.");
  }

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setApiKey("");
    const response = await fetch("/api/admin/resellers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    setBusy(false);
    setMessage(data.message || (response.ok ? "Reseller dibuat." : "Gagal membuat reseller."));
    if (!response.ok) return;
    setApiKey(data.apiKey || "");
    setForm(emptyForm);
    await load();
  }

  async function patch(id: string, body: { isActive?: boolean; addBalance?: number }) {
    setBusy(true);
    const response = await fetch("/api/admin/resellers", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    const data = await response.json();
    setBusy(false);
    setMessage(data.message || (response.ok ? "Reseller diperbarui." : "Gagal memperbarui reseller."));
    if (!response.ok) return;
    setTopup(current => ({ ...current, [id]: "" }));
    await load();
  }

  async function reviewApplication(id: string, action: "APPROVE_APPLICATION" | "REJECT_APPLICATION") {
    setBusy(true);
    setMessage("");
    setApiKey("");
    const response = await fetch("/api/admin/resellers", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id,
        action,
        initialBalance: Number(approvalBalance[id] || 0),
        rejectionReason: action === "REJECT_APPLICATION" ? "Belum memenuhi kriteria reseller." : undefined,
      }),
    });
    const data = await response.json();
    setBusy(false);
    setMessage(data.message || (response.ok ? "Pengajuan diproses." : "Gagal memproses pengajuan."));
    if (!response.ok) return;
    if (data.apiKey) setApiKey(data.apiKey);
    setApprovalBalance(current => ({ ...current, [id]: "" }));
    await load();
  }

  return (
    <section className="reseller-admin">
      <div className="reseller-summary">
        <article className="panel reseller-summary-card">
          <ShieldCheck size={18} />
          <div><strong>{activeCount}</strong><span>Reseller aktif</span></div>
        </article>
        <article className="panel reseller-summary-card">
          <WalletCards size={18} />
          <div><strong>{money(totalBalance)}</strong><span>Total saldo</span></div>
        </article>
        <article className="panel reseller-summary-card">
          <KeyRound size={18} />
          <div><strong>{totalOrders}</strong><span>Order voucher</span></div>
        </article>
      </div>

      <section className="panel reseller-list">
        <div className="reseller-list-head">
          <div><p className="eyebrow">Pengajuan reseller</p><h2>Menunggu review</h2></div>
          <span className="status-badge">{applications.length} pending</span>
        </div>
        {loading ? <p className="muted">Memuat pengajuan...</p> : !applications.length ? <p className="muted">Tidak ada pengajuan baru.</p> : (
          <div className="reseller-application-list">
            {applications.map(item => (
              <article className="reseller-application" key={item.id}>
                <div>
                  <span className="status-badge warning">Pending</span>
                  <h3>{item.businessName}</h3>
                  <p>{item.user.name} · {item.user.email}</p>
                  <p>{item.contact}{item.channel ? ` · ${item.channel}` : ""}</p>
                  {item.note ? <small>{item.note}</small> : null}
                </div>
                <div className="reseller-application-actions">
                  <input
                    type="number"
                    min={0}
                    placeholder="Saldo awal"
                    value={approvalBalance[item.id] || ""}
                    onChange={event => setApprovalBalance(current => ({ ...current, [item.id]: event.target.value }))}
                  />
                  <button type="button" className="btn btn-sm" disabled={busy} onClick={() => reviewApplication(item.id, "APPROVE_APPLICATION")}>
                    <Store size={15} /> Setujui
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => reviewApplication(item.id, "REJECT_APPLICATION")}>
                    <XCircle size={15} /> Tolak
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel reseller-create">
        <div className="reseller-head">
          <span><Plus size={19} /></span>
          <div>
            <p className="eyebrow">Reseller API</p>
            <h2>Tambah reseller</h2>
          </div>
          <Link className="btn btn-secondary btn-sm" href="/docs">Buka docs</Link>
        </div>
        <form className="reseller-form" onSubmit={create}>
          <label><span>Nama reseller</span><input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Nama toko / partner" required /></label>
          <label><span>Email owner</span><input type="email" value={form.ownerEmail} onChange={event => setForm({ ...form, ownerEmail: event.target.value })} placeholder="akun@partner.com" required /></label>
          <label><span>Saldo awal</span><input type="number" min={0} value={form.initialBalance} onChange={event => setForm({ ...form, initialBalance: Number(event.target.value) })} /></label>
          <button className="btn" disabled={busy}><Save size={16} /> Buat reseller</button>
        </form>
        {apiKey && (
          <div className="reseller-api-key">
            <div><CheckCircle2 size={16} /><strong>API key baru</strong><span>Simpan sekarang. Key tidak akan ditampilkan lagi.</span></div>
            <button type="button" onClick={() => copy(apiKey)}><ClipboardCopy size={15} />{apiKey}</button>
          </div>
        )}
      </section>

      <section className="panel reseller-list">
        <div className="reseller-list-head">
          <div><p className="eyebrow">Daftar reseller</p><h2>Partner voucher</h2></div>
          <button className="admin-icon-button" type="button" disabled={loading} onClick={() => load().catch(error => setMessage(error.message))}>
            <RefreshCw size={16} className={loading ? "spin" : ""} />
          </button>
        </div>
        {loading ? <p className="muted">Memuat reseller...</p> : !resellers.length ? <p className="muted">Belum ada reseller.</p> : (
          <div className="reseller-grid">
            {resellers.map(item => {
              const addBalance = Number(topup[item.id] || 0);
              return (
                <article className={`reseller-card${item.isActive ? "" : " inactive"}`} key={item.id}>
                  <div className="reseller-card-head">
                    <div>
                      <span className={`status-badge ${item.isActive ? "success" : "danger"}`}>{item.isActive ? "Aktif" : "Nonaktif"}</span>
                      <h3>{item.name}</h3>
                      <p>{item.owner.email}</p>
                    </div>
                    <button
                      type="button"
                      className={item.isActive ? "danger" : ""}
                      disabled={busy}
                      onClick={() => patch(item.id, { isActive: !item.isActive })}
                    >
                      {item.isActive ? <ShieldOff size={15} /> : <ShieldCheck size={15} />}
                      {item.isActive ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                  </div>
                  <div className="reseller-card-meta">
                    <span><strong>{money(item.balance)}</strong><small>Saldo</small></span>
                    <span><strong>{item._count.orders}</strong><small>Order</small></span>
                    <span><strong>{item.keyPreview}</strong><small>API key</small></span>
                  </div>
                  <div className="reseller-topup">
                    <input
                      type="number"
                      min={1}
                      placeholder="Tambah saldo"
                      value={topup[item.id] || ""}
                      onChange={event => setTopup(current => ({ ...current, [item.id]: event.target.value }))}
                    />
                    <button type="button" disabled={busy || addBalance <= 0} onClick={() => patch(item.id, { addBalance })}>Top up</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {message && <div className="admin-toast" role="status">{message}<button aria-label="Tutup notifikasi" onClick={() => setMessage("")}>×</button></div>}
    </section>
  );
}
