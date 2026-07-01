"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Layers3, Plus, RefreshCw, Save, Sparkles, ToggleLeft, ToggleRight, X } from "lucide-react";

const empty = { name: "", slug: "", price: 0, durationDays: 30, isTrial: false, isActive: true };

export function AdminPlans() {
  const [plans, setPlans] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/plans");
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Gagal memuat paket.");
      setPlans(Array.isArray(data) ? data : []);
    } catch (reason) {
      setPlans([]);
      setError(reason instanceof Error ? reason.message : "Gagal memuat paket.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const activePlans = plans.filter(plan => plan.isActive).length;
  const inactivePlans = plans.length - activePlans;
  const trialPlans = plans.filter(plan => plan.isTrial).length;

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const response = await fetch("/api/admin/plans", {
      method: editing.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    const result = await response.json();
    setMessage(result.message);
    if (response.ok) {
      setEditing(null);
      void load();
    }
  }

  if (loading) return <div className="panel admin-empty">Memuat paket akses…</div>;
  if (error && !plans.length) return <div className="panel admin-empty"><p>{error}</p><button className="btn btn-secondary" onClick={() => void load()}><RefreshCw size={16}/>Coba lagi</button></div>;

  return (
    <section className="plan-admin-shell">
      <div className="plan-admin-hero panel">
        <div>
          <p className="eyebrow">Paket akses</p>
          <h2>Susun paket tanpa keluar dari panel monetisasi</h2>
          <p className="muted">
            Ubah harga, durasi, dan status aktif dari satu tempat. Ringkasan di atas membantu
            melihat paket yang benar-benar dipakai pengguna.
          </p>
        </div>
        <button className="btn" onClick={() => setEditing({ ...empty })}>
          <Plus size={17} /> Paket baru
        </button>
      </div>

      <div className="plan-admin-summary">
        <article className="panel plan-admin-summary-card">
          <Layers3 size={18} />
          <div>
            <strong>{plans.length}</strong>
            <span>Total paket</span>
          </div>
        </article>
        <article className="panel plan-admin-summary-card">
          <ToggleRight size={18} />
          <div>
            <strong>{activePlans}</strong>
            <span>Aktif</span>
          </div>
        </article>
        <article className="panel plan-admin-summary-card">
          <ToggleLeft size={18} />
          <div>
            <strong>{inactivePlans}</strong>
            <span>Nonaktif</span>
          </div>
        </article>
        <article className="panel plan-admin-summary-card">
          <Sparkles size={18} />
          <div>
            <strong>{trialPlans}</strong>
            <span>Trial</span>
          </div>
        </article>
      </div>

      {message && <div className="panel plan-admin-banner">{message}</div>}
      {error && <div className="panel admin-empty">{error}<button className="btn btn-secondary btn-sm" onClick={() => void load()}>Muat ulang</button></div>}

      <div className="plan-admin-grid">
        {plans.map((plan) => (
          <article className={`panel plan-admin-card${plan.isActive ? "" : " inactive"}`} key={plan.id}>
            <div className="plan-admin-card-head">
              <div>
                <span className={`status-badge ${plan.isActive ? "success" : "danger"}`}>
                  {plan.isActive ? "Aktif" : "Nonaktif"}
                </span>
                <h2>{plan.name}</h2>
                <p>{plan.slug}</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setEditing({ ...plan, price: Number(plan.price) })}>
                Edit
              </button>
            </div>
            <div className="plan-admin-price">
              <strong>Rp {Number(plan.price).toLocaleString("id-ID")}</strong>
              <span>{plan.durationDays} hari akses</span>
            </div>
            <div className="plan-admin-meta">
              <span><BadgeCheck size={14} /> {plan._count.subscriptions} langganan</span>
              <span>{plan.isTrial ? "Trial" : "Paket reguler"}</span>
            </div>
          </article>
        ))}
        {!plans.length && <div className="panel admin-empty" style={{ gridColumn: "1 / -1" }}>Belum ada paket aktif.</div>}
      </div>

      {editing && (
        <div className="dialog-overlay" onClick={() => setEditing(null)}>
          <form className="dialog-card plan-form" onSubmit={save} onClick={(e) => e.stopPropagation()}>
            <div className="form-title">
              <h2>{editing.id ? "Edit paket" : "Paket baru"}</h2>
              <button type="button" onClick={() => setEditing(null)}><X /></button>
            </div>
            <label>Nama<input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} required /></label>
            <label>Slug<input value={editing.slug} onChange={e => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} required /></label>
            <div className="form-grid">
              <label>Harga<input type="number" min="0" value={editing.price} onChange={e => setEditing({ ...editing, price: Number(e.target.value) })} /></label>
              <label>Durasi hari<input type="number" min="1" value={editing.durationDays} onChange={e => setEditing({ ...editing, durationDays: Number(e.target.value) })} /></label>
            </div>
            <label className="check"><input type="checkbox" checked={editing.isTrial} onChange={e => setEditing({ ...editing, isTrial: e.target.checked })} />Paket trial</label>
            <label className="check"><input type="checkbox" checked={editing.isActive} onChange={e => setEditing({ ...editing, isActive: e.target.checked })} />Aktif</label>
            <button className="btn"><Save size={17} />Simpan paket</button>
          </form>
        </div>
      )}
    </section>
  );
}
