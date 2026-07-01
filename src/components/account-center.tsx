"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type Account = {
  profile: { name: string; email: string; emailVerifiedAt?: string | null; createdAt: string };
  subscription?: { status: string; startsAt: string; expiresAt: string; plan: { name: string } } | null;
  payments: Array<{ id: string; invoiceNumber: string; provider: string; amount: string; status: string; paidAt?: string; createdAt: string }>;
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

  return <main className="shell dashboard dashboard-context">
    <p className="eyebrow">Akun saya</p>
    <h1>{section.replace("-", " ")}</h1>
    {message && <div className="panel account-message">{message}</div>}

    {section === "profile" && <form className="panel account-form" onSubmit={async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      await request("/api/me/account", "PATCH", { action: "profile", name: form.get("name"), email: form.get("email") });
    }}>
      <label>Nama<input name="name" defaultValue={account.profile.name} required minLength={2} /></label>
      <label>Email<input name="email" type="email" defaultValue={account.profile.email} required /></label>
      <p className="muted">Status email: {account.profile.emailVerifiedAt ? "Terverifikasi" : "Belum diverifikasi"}</p>
      <button className="btn">Simpan profil</button>
    </form>}

    {section === "subscription" && <div className="panel account-detail">
      {account.subscription ? <>
        <h2>{account.subscription.plan.name}</h2>
        <p>Status: <strong>{account.subscription.status}</strong></p>
        <p>Berlaku hingga: {new Date(account.subscription.expiresAt).toLocaleString("id-ID")}</p>
        <p>Akses seluruh episode aktif selama masa paket.</p>
      </> : <><h2>Paket gratis</h2><p className="muted">Belum ada langganan aktif.</p><Link className="btn" href="/plans">Pilih paket</Link></>}
    </div>}

    {["payments", "invoices"].includes(section) && <div className="panel admin-data"><div className="admin-table-wrap"><table><thead><tr><th>Invoice</th><th>Jumlah</th><th>Status</th><th>Tanggal</th></tr></thead><tbody>
      {account.payments.map(payment => <tr key={payment.id}><td>{payment.invoiceNumber}</td><td>{money(payment.amount)}</td><td>{payment.status}</td><td>{new Date(payment.createdAt).toLocaleString("id-ID")}</td></tr>)}
    </tbody></table></div>{!account.payments.length && <p className="muted">Belum ada transaksi.</p>}</div>}

    {section === "devices" && <div className="account-list">{account.devices.map(device => <div className="panel" key={device.id}>
      <strong>{device.deviceName || device.browser || "Perangkat"}</strong><p className="muted">{device.ip || "IP tidak tersedia"} · {new Date(device.lastActiveAt).toLocaleString("id-ID")}</p>
      <button className="btn btn-sm" onClick={() => request("/api/me/devices", "DELETE", { id: device.id })}>Logout perangkat</button>
    </div>)}<button className="btn btn-secondary" onClick={() => request("/api/me/devices", "DELETE", { all: true })}>Logout semua perangkat</button></div>}

    {["history", "favorites"].includes(section) && <div className="account-list">{library.map(row => {
      const content = row.content || row; const id = row.id || content.id;
      return <div className="panel account-row" key={id}><div><strong>{content.title}</strong><p className="muted">{row.lastWatchedAt ? new Date(row.lastWatchedAt).toLocaleString("id-ID") : content.providerName}</p></div>
        <Link className="btn btn-sm" href={row.lastWatchedAt ? `/watch/${content.id}` : `/drama/${content.slug}`}>Buka</Link>
        <button className="btn btn-sm btn-secondary" onClick={async () => {
          const ok = await request("/api/me/library", "DELETE", { type: section === "history" ? "progress" : "favorite", id: section === "history" ? row.id : content.id });
          if (ok) setLibrary(items => items.filter(item => item !== row));
        }}>Hapus</button></div>;
    })}{!library.length && <div className="panel muted">Belum ada data.</div>}</div>}

    {section === "watchlist" && <div className="panel"><p>Watchlist lengkap tersedia di ringkasan dashboard.</p><Link className="btn" href="/dashboard">Buka watchlist</Link></div>}

    {section === "preferences" && <form className="panel account-form" onSubmit={async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      await request("/api/me/account", "PATCH", { action: "preferences", autoplay: form.has("autoplay"), defaultMuted: form.has("defaultMuted"), emailNotifications: form.has("emailNotifications"), playbackSpeed: Number(form.get("playbackSpeed")), preferredQuality: form.get("preferredQuality") });
    }}>
      <label><input name="autoplay" type="checkbox" defaultChecked={account.preferences?.autoplay ?? true} /> Autoplay episode</label>
      <label><input name="defaultMuted" type="checkbox" defaultChecked={account.preferences?.defaultMuted ?? true} /> Mulai tanpa suara</label>
      <label>Kecepatan<select name="playbackSpeed" defaultValue={account.preferences?.playbackSpeed ?? 1}><option value=".5">0.5x</option><option value="1">1x</option><option value="1.5">1.5x</option><option value="2">2x</option></select></label>
      <label>Kualitas<select name="preferredQuality" defaultValue={account.preferences?.preferredQuality ?? "auto"}><option>auto</option><option>360p</option><option>480p</option><option>720p</option><option>1080p</option></select></label>
      <label><input name="emailNotifications" type="checkbox" defaultChecked={account.preferences?.emailNotifications ?? true} /> Notifikasi email</label>
      <button className="btn">Simpan preferensi</button>
    </form>}

    {section === "security" && <form className="panel account-form" onSubmit={async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      const ok = await request("/api/me/account", "PATCH", { action: "password", currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword") });
      if (ok) event.currentTarget.reset();
    }}>
      <label>Password saat ini<input name="currentPassword" type="password" minLength={8} required /></label>
      <label>Password baru<input name="newPassword" type="password" minLength={8} required /></label>
      <button className="btn">Ganti password</button>
    </form>}
  </main>;
}
