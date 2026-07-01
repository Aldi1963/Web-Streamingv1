"use client";
import { useEffect, useMemo, useState } from "react";

type Action = { type: string; id: string; value: boolean | string; label: string; detail?: boolean };

export function AdminConsole({ section }: { section: string }) {
  const [data, setData] = useState<any>(null);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const load = () => fetch(`/api/admin/overview?section=${encodeURIComponent(section)}`)
    .then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.message); setData(result); })
    .catch(error => setMessage(error.message));
  useEffect(() => { setPage(1); void load(); }, [section]);
  const rows = useMemo(() => (data?.rows || []).filter((row: any) => JSON.stringify(row).toLowerCase().includes(query.toLowerCase())), [data, query]);
  const visibleRows = rows.slice((page - 1) * 20, page * 20);
  const pages = Math.max(1, Math.ceil(rows.length / 20));

  async function execute(detail?: string) {
    if (!action) return;
    setBusy(true);
    const response = await fetch("/api/admin/overview", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...action, detail }) });
    const result = await response.json();
    setBusy(false); setMessage(result.message);
    if (response.ok) { setAction(null); void load(); }
  }
  const ask = (type: string, id: string, value: boolean | string, label: string, detail = false) => setAction({ type, id, value, label, detail });
  const display = (key: string, value: any) => {
    if (value == null) return "-";
    if (typeof value === "boolean") return <span className={`status-badge ${value ? "success" : "danger"}`}>{value ? "Aktif" : "Nonaktif"}</span>;
    if (key === "status" || key === "role") return <span className={`status-badge status-${String(value).toLowerCase()}`}>{String(value)}</span>;
    if (typeof value === "object") return Object.values(value).map(String).join(" · ").slice(0, 100);
    if (/At$/.test(key) && !Number.isNaN(Date.parse(String(value)))) return new Date(value).toLocaleString("id-ID");
    return String(value);
  };
  if (!data) return <div className="panel admin-empty">{message || <span className="skeleton-line">Memuat data…</span>}</div>;
  const stats = data.stats;
  const overviewMetrics = [
    ["Pengguna", stats.users],
    ["Langganan aktif", stats.activeSubscriptions],
    ["Transaksi", stats.payments],
    ["Endpoint API", stats.endpoints],
  ] as Array<[string, number]>;
  const overviewMax = Math.max(1, ...overviewMetrics.map(([, value]) => value));
  const syncTotals = (data.recentSyncs || []).reduce((total: { success: number; failed: number }, item: any) => {
    const success = Number(item.successCount || 0);
    const all = Number(item.totalData || 0);
    total.success += success;
    total.failed += Math.max(0, all - success);
    return total;
  }, { success: 0, failed: 0 });
  const syncAll = syncTotals.success + syncTotals.failed;
  const syncSuccessRate = syncAll ? Math.round(syncTotals.success / syncAll * 100) : 0;
  return <div className="admin-console">
    {section === "dashboard" && <div className="admin-stats">
      {[["User",stats.users],["Konten",stats.contents],["Langganan aktif",stats.activeSubscriptions],["Transaksi",stats.payments],["Endpoint",stats.endpoints],["Sync bermasalah",stats.failedSyncs]].map(([label,value]) => <div className="panel" key={String(label)}>{label}<strong>{value}</strong></div>)}
    </div>}
    {section === "dashboard" && <div className="admin-charts">
      <section className="panel admin-chart-card">
        <div className="admin-chart-head"><div><p className="eyebrow">Statistik web app</p><h2>Aktivitas platform</h2></div><span>Data saat ini</span></div>
        <div className="admin-bar-chart">
          {overviewMetrics.map(([label,value]) => <div className="admin-bar-row" key={label}>
            <div className="admin-bar-label"><span>{label}</span><strong>{value.toLocaleString("id-ID")}</strong></div>
            <div className="admin-bar-track"><i style={{ width: `${value ? Math.max(4, value / overviewMax * 100) : 0}%` }}/></div>
          </div>)}
        </div>
      </section>
      <section className="panel admin-chart-card">
        <div className="admin-chart-head"><div><p className="eyebrow">10 sinkronisasi terakhir</p><h2>Kesehatan sinkronisasi</h2></div></div>
        <div className="admin-donut-wrap">
          <div className="admin-donut" style={{ background: `conic-gradient(#22c55e 0 ${syncSuccessRate}%, #ef4444 ${syncSuccessRate}% 100%)` }}><div><strong>{syncSuccessRate}%</strong><span>berhasil</span></div></div>
          <div className="admin-chart-legend"><span><i className="success"/>Berhasil <strong>{syncTotals.success.toLocaleString("id-ID")}</strong></span><span><i className="failed"/>Gagal <strong>{syncTotals.failed.toLocaleString("id-ID")}</strong></span></div>
        </div>
      </section>
    </div>}
    {data.rows && <section className="panel admin-data">
      <div className="admin-toolbar"><input aria-label="Cari data" placeholder="Cari data…" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} /><span>{rows.length} data</span></div>
      {!rows.length ? <p className="muted">Belum ada data yang cocok.</p> : <div className="admin-table-wrap"><table><thead><tr>
        {Object.keys(rows[0]).filter(key => !["id","_count"].includes(key)).map(key => <th key={key}>{key}</th>)}<th>Aksi</th>
      </tr></thead><tbody>{visibleRows.map((row: any) => <tr key={row.id}>
        {Object.entries(row).filter(([key]) => !["id","_count"].includes(key)).map(([key,value]) => <td key={key}>{display(key,value)}</td>)}
        <td className="admin-actions">
          {row.isActive !== undefined && <button onClick={() => ask("content-active",row.id,!row.isActive,row.isActive?"Nonaktifkan konten":"Aktifkan konten")}>{row.isActive?"Nonaktifkan":"Aktifkan"}</button>}
          {row.isFeatured !== undefined && <button onClick={() => ask("content-featured",row.id,!row.isFeatured,row.isFeatured?"Hapus dari unggulan":"Jadikan unggulan")}>{row.isFeatured?"Unfeature":"Feature"}</button>}
          {row.email && <button onClick={() => ask("logout-devices",row.id,true,"Logout seluruh perangkat")}>Logout perangkat</button>}
          {row.isSuspended !== undefined && <button className={!row.isSuspended?"danger":""} onClick={() => ask("user-suspended",row.id,!row.isSuspended,row.isSuspended?"Aktifkan akun":"Suspend akun")}>{row.isSuspended?"Aktifkan":"Suspend"}</button>}
          {row.role && <select aria-label="Ubah role" value={row.role} onChange={event => ask("user-role",row.id,event.target.value,`Ubah role ke ${event.target.value}`)}><option>USER</option><option>SUBSCRIBER</option><option>CONTENT_MANAGER</option><option>ADMIN</option></select>}
          {row.startsAt && row.status !== "CANCELLED" && <button className="danger" onClick={() => ask("subscription-cancel",row.id,true,"Batalkan langganan")}>Batalkan</button>}
          {row.category && row.status !== "RESOLVED" && <button onClick={() => ask("report-resolve",row.id,true,"Selesaikan laporan",true)}>Selesaikan</button>}
          {row.invoiceNumber && row.status !== "PAID" && <button onClick={() => ask("payment-paid",row.id,true,"Tandai pembayaran lunas",true)}>Tandai lunas</button>}
        </td>
      </tr>)}</tbody></table></div>}
      {pages > 1 && <div className="table-pagination"><button disabled={page === 1} onClick={() => setPage(value => value - 1)}>Sebelumnya</button><span>{page} / {pages}</span><button disabled={page === pages} onClick={() => setPage(value => value + 1)}>Berikutnya</button></div>}
    </section>}
    {data.recentSyncs && <section className="panel admin-data"><h2>Sinkronisasi terbaru</h2>{data.recentSyncs.map((item:any)=><p key={item.id}><strong>{item.providerName}</strong> · <span className={`status-badge status-${item.status.toLowerCase()}`}>{item.status}</span> · {item.successCount}/{item.totalData} berhasil</p>)}</section>}
    {message && <div className="admin-toast" role="status">{message}<button aria-label="Tutup notifikasi" onClick={() => setMessage("")}>×</button></div>}
    {action && <div className="dialog-overlay" onClick={() => setAction(null)}><form className="dialog-card" role="dialog" aria-modal="true" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void execute(String(form.get("detail") || "")); }} onClick={event => event.stopPropagation()}>
      <h2>Konfirmasi tindakan</h2><p>Anda akan <strong>{action.label}</strong>. Tindakan ini dicatat dalam audit log.</p>
      {action.detail && <label>Catatan<textarea name="detail" required maxLength={1000} rows={4} /></label>}
      <div className="dialog-actions"><button type="button" className="btn btn-secondary" onClick={() => setAction(null)}>Batal</button><button className="btn" disabled={busy}>{busy?"Memproses…":"Konfirmasi"}</button></div>
    </form></div>}
  </div>;
}
