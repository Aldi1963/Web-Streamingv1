"use client";

import Link from "next/link";
import { CalendarDays, CheckCircle2, CreditCard, Gauge, Laptop, MonitorPlay, Play, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { RedeemCodePanel } from "@/components/redeem-code-panel";

type Account = {
  profile: { name: string; email: string; emailVerifiedAt?: string | null; createdAt: string };
  subscription?: { status: string; startsAt: string; expiresAt: string; graceEndsAt?: string | null; plan: { name: string; maxDevices: number; maxResolution: string; providerAccess?: unknown } } | null;
  subscriptionHistory: Array<{ id: string; status: string; startsAt: string; expiresAt: string; plan: { name: string } }>;
  payments: Array<{ id: string; invoiceNumber: string; provider: string; amount: string; status: string; paidAt?: string | null; expiresAt?: string | null; createdAt: string }>;
  devices: Array<{ id: string; deviceName?: string; browser?: string; ip?: string; lastActiveAt: string; expiresAt: string }>;
  preferences?: { autoplay: boolean; defaultMuted: boolean; playbackSpeed: number; preferredQuality: string; emailNotifications: boolean } | null;
};

export function AccountCenter({ section }: { section: string }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [library, setLibrary] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  const load = async () => {
    const response = await fetch("/api/me/account");
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    setAccount(data);
  };
  useEffect(() => {
    void load().catch(error => setMessage(error.message));
    if (["history", "favorites"].includes(section)) {
      void fetch(`/api/me/library?type=${section}`).then(response => response.json()).then(setLibrary);
    }
  }, [section]);

  async function request(url: string, method: string, body: unknown) {
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json();
    setMessage(data.message || (response.ok ? "Berhasil." : "Gagal."));
    if (response.ok) await load();
    return response.ok;
  }

  if (!account) return <main className="shell dashboard-context"><div className="panel">{message || "Memuat akun…"}</div></main>;
  const money = (value: string) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value));
  const paymentStatusLabel = (status: string) => ({
    PENDING: "Pending",
    PAID: "Lunas",
    FAILED: "Gagal",
    EXPIRED: "Gagal",
    CANCELLED: "Dibatalkan",
  }[status] || status);
  const subscriptionStatusLabel = (status: string) => ({ ACTIVE: "Aktif", TRIAL: "Trial", GRACE: "Masa tenggang", EXPIRED: "Selesai", CANCELLED: "Dibatalkan" }[status] || status);

  const preferencesSection = section === "preferences";
  return <main className="shell dashboard dashboard-context">
    <p className="eyebrow">Akun saya</p>
    <h1>{preferencesSection ? "Pengaturan" : section.replace("-", " ")}</h1>
    {message && <div className="panel account-message">{message}</div>}

    {preferencesSection && <section className="settings-page">
      <form className="panel account-form" onSubmit={async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      await request("/api/me/account", "PATCH", { action: "profile", name: form.get("name"), email: form.get("email") });
    }}>
      <p className="eyebrow">Profil</p>
      <label>Nama<input name="name" defaultValue={account.profile.name} required minLength={2} /></label>
      <label>Email<input name="email" type="email" defaultValue={account.profile.email} required /></label>
      <p className="muted">Status email: {account.profile.emailVerifiedAt ? "Terverifikasi" : "Belum diverifikasi"}</p>
      <button className="btn">Simpan profil</button>
    </form>
      <form className="panel account-form" onSubmit={async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      await request("/api/me/account", "PATCH", { action: "preferences", autoplay: form.has("autoplay"), defaultMuted: form.has("defaultMuted"), emailNotifications: form.has("emailNotifications"), playbackSpeed: Number(form.get("playbackSpeed")), preferredQuality: form.get("preferredQuality") });
    }}>
      <p className="eyebrow">Preferensi tontonan</p>
      <label><input name="autoplay" type="checkbox" defaultChecked={account.preferences?.autoplay ?? true} /> Autoplay episode</label>
      <label><input name="defaultMuted" type="checkbox" defaultChecked={account.preferences?.defaultMuted ?? true} /> Mulai tanpa suara</label>
      <label>Kecepatan<select name="playbackSpeed" defaultValue={account.preferences?.playbackSpeed ?? 1}><option value=".5">0.5x</option><option value="1">1x</option><option value="1.5">1.5x</option><option value="2">2x</option></select></label>
      <label>Kualitas<select name="preferredQuality" defaultValue={account.preferences?.preferredQuality ?? "auto"}><option>auto</option><option>360p</option><option>480p</option><option>720p</option><option>1080p</option></select></label>
      <label><input name="emailNotifications" type="checkbox" defaultChecked={account.preferences?.emailNotifications ?? true} /> Notifikasi email</label>
      <button className="btn">Simpan preferensi</button>
    </form>
      <form className="panel account-form" onSubmit={async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      const ok = await request("/api/me/account", "PATCH", { action: "password", currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword") });
      if (ok) event.currentTarget.reset();
    }}>
      <p className="eyebrow">Keamanan</p>
      <label>Password saat ini<input name="currentPassword" type="password" minLength={8} required /></label>
      <label>Password baru<input name="newPassword" type="password" minLength={8} required /></label>
      <button className="btn">Ganti password</button>
    </form>
    </section>}

    {section === "subscription" && (() => {
      const subscription = account.subscription;
      const now = Date.now();
      const startsAt = subscription ? new Date(subscription.startsAt).getTime() : now;
      const accessEndsAt = subscription?.status === "GRACE" && subscription.graceEndsAt
        ? new Date(subscription.graceEndsAt).getTime()
        : subscription ? new Date(subscription.expiresAt).getTime() : now;
      const total = Math.max(1, accessEndsAt - startsAt);
      const progress = subscription ? Math.min(100, Math.max(0, Math.round((now - startsAt) / total * 100))) : 0;
      const daysLeft = subscription ? Math.max(0, Math.ceil((accessEndsAt - now) / 86_400_000)) : 0;
      const activeDevices = account.devices.filter(device => new Date(device.expiresAt).getTime() > now).length;
      const providerAccess = Array.isArray(subscription?.plan.providerAccess)
        ? subscription.plan.providerAccess.length ? `${subscription.plan.providerAccess.length} provider` : "Semua provider"
        : "Semua provider";
      const recentPayments = account.payments.slice(0, 3);
      return <section className="subscription-center">
        <div className="subscription-overview">
          <section className="subscription-plan-card">
            <div className="subscription-plan-head">
              <div className="subscription-plan-title">
                <span className="dashboard-plan-icon"><CreditCard size={21}/></span>
                <div><p className="eyebrow">Paket saat ini</p><h2>{subscription?.plan.name ?? "Paket gratis"}</h2></div>
              </div>
              <span className={`subscription-status ${subscription?.status.toLowerCase() ?? "free"}`}><CheckCircle2 size={14}/>{subscription ? subscriptionStatusLabel(subscription.status) : "Gratis"}</span>
            </div>
            {subscription ? <>
              <div className="subscription-dates">
                <span><CalendarDays size={16}/>Berlaku hingga {new Date(accessEndsAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
                <strong>{daysLeft} hari tersisa</strong>
              </div>
              <div className="subscription-lifetime"><div className="subscription-lifetime-track"><span style={{ width: `${progress}%` }}/></div></div>
            </> : <p className="muted">Pilih paket untuk membuka seluruh episode premium.</p>}
            <div className="subscription-actions">
              <Link className="btn" href="/plans">{subscription ? "Perpanjang paket" : "Pilih paket"}</Link>
              {subscription && <Link className="btn btn-secondary" href="/plans">Lihat paket lain</Link>}
            </div>
          </section>

          <section className="subscription-usage">
            <h2>Penggunaan & benefit</h2>
            <div className="subscription-usage-row"><Laptop size={18}/><span>Perangkat<strong>{activeDevices} / {subscription?.plan.maxDevices ?? 1} aktif</strong></span><Link href="/dashboard/devices">Kelola</Link></div>
            <div className="subscription-usage-row"><MonitorPlay size={18}/><span>Kualitas video<strong>{subscription?.plan.maxResolution ?? "720p"}</strong></span></div>
            <div className="subscription-usage-row"><Gauge size={18}/><span>Akses konten<strong>{providerAccess}</strong></span></div>
          </section>
        </div>

        <div className="subscription-redeem"><RedeemCodePanel /></div>

        <div className="subscription-lists">
          <section className="subscription-list">
            <div className="subscription-list-head"><h2>Riwayat langganan</h2></div>
            {account.subscriptionHistory.slice(0, 3).map(item => <div className="subscription-list-row" key={item.id}>
              <span className="subscription-list-copy"><strong>{item.plan.name}</strong><small>{new Date(item.startsAt).toLocaleDateString("id-ID")} - {new Date(item.expiresAt).toLocaleDateString("id-ID")}</small></span>
              <span className="subscription-list-value">{subscriptionStatusLabel(item.status)}</span>
              <span className={`status-badge status-${item.status.toLowerCase()}`}>{subscriptionStatusLabel(item.status)}</span>
            </div>)}
            {!account.subscriptionHistory.length && <p className="subscription-empty">Belum ada riwayat langganan.</p>}
          </section>

          <section className="subscription-list">
            <div className="subscription-list-head"><h2>Tagihan terakhir</h2><Link className="section-link" href="/dashboard/payments">Lihat semua</Link></div>
            {recentPayments.map(payment => <div className="subscription-list-row" key={payment.id}>
              <span className="subscription-list-copy"><strong>{payment.invoiceNumber}</strong><small>{new Date(payment.createdAt).toLocaleDateString("id-ID")}</small></span>
              <span className="subscription-list-value">{money(payment.amount)}</span>
              <Link className={`status-badge status-${payment.status.toLowerCase()}`} href={`/payment/${payment.invoiceNumber}`}>{paymentStatusLabel(payment.status)}</Link>
            </div>)}
            {!recentPayments.length && <p className="subscription-empty">Belum ada tagihan.</p>}
          </section>
        </div>
      </section>;
    })()}

    {["payments", "invoices"].includes(section) && <div className="panel admin-data"><div className="admin-table-wrap"><table><thead><tr><th>Invoice</th><th>Jumlah</th><th>Status</th><th>Batas waktu</th><th>Dibayar</th><th>Aksi</th></tr></thead><tbody>
      {account.payments.map(payment => <tr key={payment.id}>
        <td>{payment.invoiceNumber}</td>
        <td>{money(payment.amount)}</td>
        <td><span className={`status-badge status-${payment.status.toLowerCase()}`}>{paymentStatusLabel(payment.status)}</span></td>
        <td>{payment.expiresAt ? new Date(payment.expiresAt).toLocaleString("id-ID") : "-"}</td>
        <td>{payment.paidAt ? new Date(payment.paidAt).toLocaleString("id-ID") : "-"}</td>
        <td>{payment.status === "PENDING" ? <Link className="btn btn-sm" href={`/payment/${payment.invoiceNumber}`}>Bayar</Link> : "-"}</td>
      </tr>)}
    </tbody></table></div>{!account.payments.length && <p className="muted">Belum ada transaksi.</p>}</div>}

    {section === "devices" && <div className="account-list">{account.devices.map(device => <div className="panel" key={device.id}>
      <strong>{device.deviceName || device.browser || "Perangkat"}</strong><p className="muted">{device.ip || "IP tidak tersedia"} · {new Date(device.lastActiveAt).toLocaleString("id-ID")}</p>
      <button className="btn btn-sm" onClick={() => request("/api/me/devices", "DELETE", { id: device.id })}>Logout perangkat</button>
    </div>)}<button className="btn btn-secondary" onClick={() => request("/api/me/devices", "DELETE", { all: true })}>Logout semua perangkat</button></div>}

    {["history", "favorites"].includes(section) && <div className="grid continue-grid dashboard-library-grid">{library.map(row => {
      const content = row.content || row; const id = row.id || content.id;
      const episode = row.lastWatchedAt
        ? content.episodes?.find((item: { id: string }) => item.id === row.episodeId)
        : null;
      const href = row.lastWatchedAt
        ? `/watch/${content.id}${episode ? `?ep=${episode.episodeNumber}` : ""}`
        : `/drama/${content.slug}`;
      return <article className="card progress-card dashboard-library-card" key={id}>
        <Link href={href} className="dashboard-library-poster">
          <div className="card-poster">
            {content.posterUrl ? <img src={content.posterUrl} alt={content.title} loading="lazy" /> : <div className="placeholder"><span><Play size={30} /></span></div>}
            <span className="card-badge-rating progress-badge">{content.type || "Drama"}</span>
            <div className="progress-overlay"><div className="progress-overlay-bar"><span style={{ width: "100%" }} /></div></div>
          </div>
        </Link>
        <div className="card-body dashboard-library-body">
          <h3>{content.title}</h3>
          <div className="meta">{row.lastWatchedAt ? new Date(row.lastWatchedAt).toLocaleString("id-ID") : content.providerName}</div>
          <div className="dashboard-library-actions">
            <Link className="btn btn-sm" href={href}>Buka</Link>
            <button className="btn btn-sm btn-secondary" aria-label={`Hapus ${content.title}`} onClick={async () => {
          const ok = await request("/api/me/library", "DELETE", { type: section === "history" ? "progress" : "favorite", id: content.id });
          if (ok) setLibrary(items => items.filter(item => item !== row));
        }}><Trash2 size={14} />Hapus</button>
          </div>
        </div>
      </article>;
    })}{!library.length && <div className="panel muted">Belum ada data.</div>}</div>}

    {section === "watchlist" && <div className="panel"><p>Watchlist lengkap tersedia di ringkasan dashboard.</p><Link className="btn" href="/dashboard">Buka watchlist</Link></div>}

  </main>;
}
