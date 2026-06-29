"use client";

import { useEffect, useState } from "react";

type Setting = { key: string; value: string; sensitive: boolean; configured: boolean };

const labels: Record<string, string> = {
  PAYMENT_PROVIDER: "Payment provider",
  PAKASIR_API_KEY: "Pakasir API key",
  PAKASIR_SLUG: "Pakasir slug",
  MIDTRANS_SERVER_KEY: "Midtrans server key",
  MIDTRANS_CLIENT_KEY: "Midtrans client key",
  XENDIT_SECRET_KEY: "Xendit secret key",
  MAIL_HOST: "SMTP host",
  MAIL_PORT: "SMTP port",
  MAIL_USERNAME: "SMTP username",
  MAIL_PASSWORD: "SMTP password",
  MAIL_FROM_ADDRESS: "Alamat pengirim email",
  CLOUDFLARE_TURNSTILE_SITE_KEY: "Turnstile site key",
  CLOUDFLARE_TURNSTILE_SECRET_KEY: "Turnstile secret key",
  CRON_SECRET: "Cron secret",
};

export function AdminSettingsForm() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("Memuat...");

  useEffect(() => {
    fetch("/api/admin/settings").then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setSettings(data.settings);
      setValues(Object.fromEntries(data.settings.map((item: Setting) => [item.key, item.value])));
      setMessage("");
    }).catch((error) => setMessage(error.message));
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("Menyimpan...");
    const response = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: values }),
    });
    const data = await response.json();
    setMessage(data.message || (response.ok ? "Tersimpan." : "Gagal menyimpan."));
    if (response.ok) setSettings(data.settings);
  }

  return <form className="panel" style={{ marginTop: 20 }} onSubmit={submit}>
    <h2>Integrasi & kredensial</h2>
    <p className="muted">Secret dienkripsi di database. Secret yang sudah tersimpan tidak pernah ditampilkan kembali; biarkan kosong untuk mempertahankannya.</p>
    <div style={{ display: "grid", gap: 14 }}>
      {settings.map((item) => <label key={item.key} style={{ display: "grid", gap: 6 }}>
        <span>{labels[item.key] || item.key} {item.sensitive && item.configured ? "• tersimpan" : ""}</span>
        {item.key === "PAYMENT_PROVIDER"
          ? <select value={values[item.key] || "pakasir"} onChange={(event) => setValues({ ...values, [item.key]: event.target.value })}>
              <option value="pakasir">Pakasir</option><option value="midtrans">Midtrans</option><option value="xendit">Xendit</option>
            </select>
          : <input type={item.sensitive ? "password" : "text"} autoComplete="off"
              placeholder={item.sensitive && item.configured ? "•••••••• (tidak diubah)" : ""}
              value={values[item.key] || ""} onChange={(event) => setValues({ ...values, [item.key]: event.target.value })} />}
      </label>)}
    </div>
    <button className="button" style={{ marginTop: 18 }} type="submit">Simpan pengaturan</button>
    {message && <p className="muted">{message}</p>}
  </form>;
}
