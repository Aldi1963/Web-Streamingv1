"use client";
import { useEffect, useMemo, useState } from "react";

export function AdminConsole({ section }: { section: string }) {
  const [data, setData] = useState<any>(null);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const load = () => fetch(`/api/admin/overview?section=${encodeURIComponent(section)}`)
    .then(async r => { const x = await r.json(); if (!r.ok) throw new Error(x.message); setData(x); })
    .catch(e => setMessage(e.message));
  useEffect(() => { void load(); }, [section]);
  const rows = useMemo(() => (data?.rows || []).filter((row: any) =>
    JSON.stringify(row).toLowerCase().includes(query.toLowerCase())), [data, query]);
  async function toggle(type: string, id: string, value: boolean) {
    if (!confirm("Terapkan perubahan ini?")) return;
    const r = await fetch("/api/admin/overview", { method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id, value }) });
    const x = await r.json(); setMessage(x.message); if (r.ok) load();
  }
  function syncSummary(row: any) {
    try {
      const detail = JSON.parse(row.message || "{}");
      const seconds = row.finishedAt ? Math.max(0, Math.round((new Date(row.finishedAt).getTime() - new Date(row.startedAt).getTime()) / 1000)) : 0;
      return `${detail.inserted || 0} baru · ${detail.updated || 0} diperbarui · ${row.failedCount} gagal · ${seconds} detik`;
    } catch {
      return `${row.successCount}/${row.totalData} berhasil`;
    }
  }
  if (!data) return <div className="panel admin-empty">{message || "Memuat data..."}</div>;
  const s = data.stats;
  return <div className="admin-console">
    <div className="admin-stats">
      <div className="panel">User<strong>{s.users}</strong></div><div className="panel">Konten<strong>{s.contents}</strong></div>
      <div className="panel">Langganan aktif<strong>{s.activeSubscriptions}</strong></div><div className="panel">Transaksi<strong>{s.payments}</strong></div>
      <div className="panel">Endpoint<strong>{s.endpoints}</strong></div><div className="panel">Sync bermasalah<strong>{s.failedSyncs}</strong></div>
    </div>
    {data.rows && <section className="panel admin-data">
      <div className="admin-toolbar"><input placeholder="Cari data…" value={query} onChange={e => setQuery(e.target.value)} /><span>{rows.length} data</span></div>
      {!rows.length ? <p className="muted">Belum ada data.</p> : <div className="admin-table-wrap"><table><thead><tr>
        {Object.keys(rows[0]).filter(k => !["id","_count"].includes(k)).map(k => <th key={k}>{k}</th>)}<th>Aksi</th>
      </tr></thead><tbody>{rows.map((row: any) => <tr key={row.id}>
        {Object.entries(row).filter(([k]) => !["id","_count"].includes(k)).map(([k,v]) => <td key={k}>{typeof v === "object" ? JSON.stringify(v) : typeof v === "boolean" ? (v ? "Aktif" : "Nonaktif") : String(v ?? "-")}</td>)}
        <td>{row.isActive !== undefined && <button onClick={() => toggle("content-active",row.id,!row.isActive)}>{row.isActive ? "Nonaktifkan" : "Aktifkan"}</button>}
        {row.isFeatured !== undefined && <button onClick={() => toggle("content-featured",row.id,!row.isFeatured)}>{row.isFeatured ? "Unfeature" : "Feature"}</button>}
        {row.email && <button onClick={() => toggle("logout-devices",row.id,true)}>Logout perangkat</button>}
        {row.invoiceNumber && row.status !== "PAID" && <button onClick={() => toggle("payment-paid",row.id,true)}>Tandai lunas</button>}</td>
      </tr>)}</tbody></table></div>}
    </section>}
    {data.recentSyncs && <section className="panel admin-data"><h2>Sinkronisasi terbaru</h2>{data.recentSyncs.map((x:any)=><p key={x.id}><strong>{x.providerName}</strong> · {x.status} · {syncSummary(x)}</p>)}</section>}
    {message && <div className="admin-toast">{message}</div>}
  </div>;
}
