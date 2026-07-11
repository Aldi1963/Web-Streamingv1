"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, Eye, PauseCircle, RefreshCw } from "lucide-react";

type ProviderSummary = {
  slug: string;
  name: string;
  contents: number;
  views: number;
  playbackIssues: number;
  endpointActive: number;
  endpointInactive: number;
  isSyncEnabled: boolean;
  lastSyncedAt: string | null;
  latestSync: {
    status: string;
    totalData: number;
    successCount: number;
    failedCount: number;
    startedAt: string;
    errors: string[];
  } | null;
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("id-ID") : "Belum pernah";
}

function syncTone(provider: ProviderSummary) {
  if (!provider.isSyncEnabled) return "neutral";
  if (!provider.latestSync) return "warning";
  return provider.latestSync.status === "SUCCESS" ? "success" : "danger";
}

function syncLabel(provider: ProviderSummary) {
  if (!provider.isSyncEnabled) return "Nonaktif";
  if (!provider.latestSync) return "Belum sync";
  return provider.latestSync.status === "SUCCESS" ? "Sync OK" : "Sync error";
}

export function AdminProviders() {
  const [data, setData] = useState<ProviderSummary[]>([]);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const load = () => fetch("/api/admin/providers-summary").then((response) => response.json()).then(setData);
  useEffect(() => {
    void load();
  }, []);

  async function syncProvider(provider: ProviderSummary, full = false) {
    const key = `${provider.slug}:${full ? "full" : "quick"}`;
    setBusy(key);
    setMessage("");
    try {
      const response = await fetch("/api/admin/clipku/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providers: [provider.slug], full }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Sinkronisasi gagal.");
      const sync = result.results?.[0];
      setMessage(`${provider.name}: ${sync?.inserted || 0} baru, ${sync?.updated || 0} diperbarui, ${sync?.failed || 0} gagal.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sinkronisasi gagal.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="provider-admin-shell">
      {message && <div className="panel provider-admin-message" role="status">{message}</div>}
      <div className="provider-admin-grid">
        {data.map((provider) => {
          const tone = syncTone(provider);
          const StatusIcon = tone === "success" ? CheckCircle2 : tone === "danger" ? AlertTriangle : PauseCircle;
          const quickBusy = busy === `${provider.slug}:quick`;
          const fullBusy = busy === `${provider.slug}:full`;
          return (
            <article className={`panel provider-admin-card ${tone}`} key={provider.slug}>
              <div className="provider-admin-head">
                <Database />
                <div>
                  <h2>{provider.name}</h2>
                  <code>{provider.slug}</code>
                </div>
                <span className={`status-badge ${tone === "danger" ? "danger" : tone === "success" ? "success" : ""}`}>
                  <StatusIcon size={13} />
                  {syncLabel(provider)}
                </span>
              </div>
              <div className="provider-admin-stats">
                <span>Konten<strong>{provider.contents.toLocaleString("id-ID")}</strong></span>
                <span><Eye size={14} /> Views<strong>{provider.views.toLocaleString("id-ID")}</strong></span>
                <span><AlertTriangle size={14} /> Playback<strong>{provider.playbackIssues.toLocaleString("id-ID")}</strong></span>
                <span><RefreshCw size={14} /> Sync gagal<strong>{(provider.latestSync?.failedCount || 0).toLocaleString("id-ID")}</strong></span>
              </div>
              <div className="provider-admin-meta">
                <p>Sync konten: {formatDate(provider.lastSyncedAt)}</p>
                <p>Endpoint aktif: {provider.endpointActive} / nonaktif: {provider.endpointInactive}</p>
              </div>
              {provider.latestSync && (
                <div className="provider-sync-note">
                  <span>
                    Terakhir: {provider.latestSync.successCount.toLocaleString("id-ID")} sukses dari {provider.latestSync.totalData.toLocaleString("id-ID")} data
                  </span>
                  {provider.latestSync.errors.slice(0, 2).map((error) => <small key={error}>{error}</small>)}
                </div>
              )}
              <div className="provider-admin-actions">
                <button type="button" disabled={!provider.isSyncEnabled || !!busy} onClick={() => void syncProvider(provider)}>
                  <RefreshCw size={14} className={quickBusy ? "spin" : ""} />
                  {quickBusy ? "Sync..." : "Sync ulang"}
                </button>
                <button type="button" disabled={!provider.isSyncEnabled || !!busy} onClick={() => void syncProvider(provider, true)}>
                  {fullBusy ? "Full sync..." : "Full sync"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
