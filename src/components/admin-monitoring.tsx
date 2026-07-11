"use client";
import { Activity, AlertTriangle, CheckCircle2, Database, MemoryStick, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

export function AdminMonitoring() {
  const [data,setData]=useState<any>(null); const [error,setError]=useState("");
  const load=()=>fetch("/api/admin/monitoring").then(async response=>{const result=await response.json();if(!response.ok)throw new Error(result.message);setData(result);setError("");}).catch(reason=>setError(reason.message));
  useEffect(()=>{void load();const timer=setInterval(load,30000);return()=>clearInterval(timer)},[]);
  if(!data)return <div className="panel">{error||"Memuat monitoring…"}</div>;
  const s=data.stats;
  return <div className="monitoring-page">
    <div className="monitoring-toolbar"><p>Diperbarui {new Date(data.generatedAt).toLocaleTimeString("id-ID")}</p><button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={16}/>Refresh</button></div>
    <div className="admin-stats monitoring-stats">
      <div className="panel"><CheckCircle2/>Success rate<strong>{s.successRate}%</strong></div><div className="panel"><Activity/>Request 24 jam<strong>{s.totalRequests}</strong></div>
      <div className="panel"><AlertTriangle/>Request gagal<strong>{s.failedRequests}</strong></div><div className="panel"><AlertTriangle/>Laporan terbuka<strong>{s.openReports}</strong></div>
      <div className="panel"><Database/>Playback gagal aktif<strong>{s.failedPlaybackActive}</strong><span className="muted">Nonaktif: {s.failedPlaybackInactive}</span></div><div className="panel"><MemoryStick/>Memory server<strong>{data.system.memoryMb} MB</strong></div>
    </div>
    <section className="panel admin-data"><h2>Kesehatan provider</h2><div className="provider-health">{data.providers.map((provider:any)=><div key={provider.name}><strong>{provider.name}</strong><span>{provider.requests} request</span><span>{provider.averageMs} ms rata-rata</span></div>)}</div></section>
    <section className="panel admin-data"><h2>Playback bermasalah</h2>{!data.playbackIssues?.length?<p className="muted">Tidak ada playback bermasalah.</p>:<div className="admin-table-wrap"><table><thead><tr><th>Provider</th><th>Status</th><th>Aktif</th><th>Jumlah</th></tr></thead><tbody>{data.playbackIssues.map((row:any)=><tr key={`${row.providerSlug}-${row.status}-${row.active}`}><td>{row.providerName || row.providerSlug}</td><td>{row.status}</td><td>{row.active ? "Ya" : "Tidak"}</td><td>{row.count}</td></tr>)}</tbody></table></div>}</section>
    <section className="panel admin-data"><h2>Error terbaru</h2>{!data.recentErrors.length?<p className="muted">Tidak ada error tercatat.</p>:<div className="admin-table-wrap"><table><thead><tr><th>Provider</th><th>Status</th><th>Waktu</th><th>Error</th></tr></thead><tbody>{data.recentErrors.map((row:any)=><tr key={row.id}><td>{row.providerName}</td><td>{row.responseStatus||"-"}</td><td>{row.responseTime} ms</td><td title={row.errorMessage||row.url}>{row.errorMessage||row.url}</td></tr>)}</tbody></table></div>}</section>
  </div>;
}
