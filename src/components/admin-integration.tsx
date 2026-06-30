"use client";
import { RefreshCw, Search, Server, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export function AdminIntegration() {
  const [endpoints,setEndpoints]=useState<any[]>([]); const [selected,setSelected]=useState<string[]>([]); const [busy,setBusy]=useState(""); const [message,setMessage]=useState("");
  const load=()=>fetch("/api/admin/clipku/endpoints").then(response=>response.json()).then(data=>setEndpoints(Array.isArray(data)?data:[]));
  useEffect(()=>{void load()},[]);
  const providers=useMemo(()=>Array.from(new Map(endpoints.map(item=>[item.providerSlug,{slug:item.providerSlug,name:item.providerName,type:item.providerType}])).values()),[endpoints]);
  async function action(kind:"scan"|"sync") { setBusy(kind);setMessage(""); const response=await fetch(kind==="scan"?"/api/admin/clipku/scan":"/api/admin/clipku/sync",{method:"POST",headers:{"Content-Type":"application/json"},body:kind==="sync"?JSON.stringify({providers:selected,full:false}):undefined});const result=await response.json();setBusy("");setMessage(result.message||`${kind==="scan"?"Scan":"Sinkronisasi"} selesai.`);if(response.ok)void load();}
  return <div className="integration-page">
    <section className="integration-hero"><div><p className="eyebrow">Provider gateway</p><h2>Integrasi Clipku API</h2><p>Pindai endpoint, pilih provider, dan jalankan sinkronisasi dari satu halaman.</p></div><div><button className="btn btn-secondary" disabled={!!busy} onClick={()=>action("scan")}><Search size={17}/>{busy==="scan"?"Memindai…":"Pindai endpoint"}</button><button className="btn" disabled={!!busy||!selected.length} onClick={()=>action("sync")}><RefreshCw size={17}/>{busy==="sync"?"Sinkronisasi…":`Sinkronkan ${selected.length||""}`}</button></div></section>
    {message&&<div className="panel integration-message" role="status">{message}</div>}
    <div className="integration-summary"><div className="panel"><Server/>Provider<strong>{providers.length}</strong></div><div className="panel"><Zap/>Endpoint aktif<strong>{endpoints.filter(item=>item.isActive).length}</strong></div></div>
    <section className="panel admin-data"><div className="admin-toolbar"><h2>Provider</h2><button onClick={()=>setSelected(selected.length===providers.length?[]:providers.map(item=>item.slug))}>{selected.length===providers.length?"Batalkan semua":"Pilih semua"}</button></div><div className="provider-selector">{providers.map(provider=><label key={provider.slug}><input type="checkbox" checked={selected.includes(provider.slug)} onChange={()=>setSelected(current=>current.includes(provider.slug)?current.filter(item=>item!==provider.slug):[...current,provider.slug])}/><span><strong>{provider.name}</strong><small>{provider.type} · {endpoints.filter(item=>item.providerSlug===provider.slug).length} endpoint</small></span></label>)}</div></section>
  </div>;
}
