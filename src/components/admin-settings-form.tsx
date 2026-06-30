"use client";

import { CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, Save, ShieldCheck, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Setting = { key: string; value: string; sensitive: boolean; configured: boolean };
type Group = { title: string; description: string; icon: typeof Mail; keys: string[] };

const labels: Record<string, { label: string; help: string }> = {
  PAYMENT_PROVIDER: { label: "Gateway aktif", help: "Gateway yang digunakan saat pengguna membuat pembayaran." },
  PAKASIR_API_KEY: { label: "Pakasir API key", help: "Kunci server dari dashboard Pakasir." },
  PAKASIR_SLUG: { label: "Pakasir slug", help: "Slug proyek Pakasir untuk membuat URL pembayaran." },
  MIDTRANS_SERVER_KEY: { label: "Midtrans server key", help: "Kunci privat untuk verifikasi transaksi Midtrans." },
  MIDTRANS_CLIENT_KEY: { label: "Midtrans client key", help: "Kunci publik untuk antarmuka pembayaran." },
  XENDIT_SECRET_KEY: { label: "Xendit secret key", help: "Kunci privat API Xendit." },
  MAIL_HOST: { label: "SMTP host", help: "Hostname server pengiriman email." },
  MAIL_PORT: { label: "SMTP port", help: "Umumnya 587 untuk STARTTLS atau 465 untuk TLS." },
  MAIL_USERNAME: { label: "SMTP username", help: "Username autentikasi SMTP." },
  MAIL_PASSWORD: { label: "SMTP password", help: "Password atau app password SMTP." },
  MAIL_FROM_ADDRESS: { label: "Alamat pengirim", help: "Alamat From untuk email sistem." },
  CLOUDFLARE_TURNSTILE_SITE_KEY: { label: "Turnstile site key", help: "Kunci publik challenge anti-bot." },
  CLOUDFLARE_TURNSTILE_SECRET_KEY: { label: "Turnstile secret key", help: "Kunci privat verifikasi Turnstile." },
  CRON_SECRET: { label: "Cron secret", help: "Token untuk melindungi endpoint sinkronisasi terjadwal." },
};

const paymentGroups: Group[] = [
  { title: "Gateway pembayaran", description: "Pilih provider aktif dan konfigurasi kredensialnya.", icon: WalletCards, keys: ["PAYMENT_PROVIDER","PAKASIR_API_KEY","PAKASIR_SLUG","MIDTRANS_SERVER_KEY","MIDTRANS_CLIENT_KEY","XENDIT_SECRET_KEY"] },
];
const systemGroups: Group[] = [
  { title: "Email sistem", description: "Konfigurasi SMTP untuk verifikasi, invoice, dan notifikasi.", icon: Mail, keys: ["MAIL_HOST","MAIL_PORT","MAIL_USERNAME","MAIL_PASSWORD","MAIL_FROM_ADDRESS"] },
  { title: "Keamanan & otomasi", description: "Perlindungan bot dan akses proses terjadwal.", icon: ShieldCheck, keys: ["CLOUDFLARE_TURNSTILE_SITE_KEY","CLOUDFLARE_TURNSTILE_SECRET_KEY","CRON_SECRET"] },
];

export function AdminSettingsForm({ section = "settings" }: { section?: string }) {
  const groups = section === "payment-settings" ? paymentGroups : systemGroups;
  const allowed = useMemo(() => new Set(groups.flatMap(group => group.keys)), [groups]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [initial, setInitial] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Set<string>>(new Set());
  const [state, setState] = useState<"loading"|"idle"|"saving"|"saved"|"error">("loading");
  const [message, setMessage] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings").then(async response => {
      const data = await response.json(); if (!response.ok) throw new Error(data.message);
      const next = Object.fromEntries(data.settings.map((item: Setting) => [item.key, item.value]));
      setSettings(data.settings); setValues(next); setInitial(next); setState("idle");
    }).catch(error => { setMessage(error.message); setState("error"); });
  }, []);
  const dirty = Object.keys(values).some(key => allowed.has(key) && values[key] !== initial[key]);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setState("saving"); setMessage("");
    const payload = Object.fromEntries(Object.entries(values).filter(([key]) => allowed.has(key)));
    const response = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ settings: payload }) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.message || "Gagal menyimpan."); setState("error"); return; }
    const next = Object.fromEntries(data.settings.map((item: Setting) => [item.key, item.value]));
    setSettings(data.settings); setValues(next); setInitial(next); setMessage(data.message); setState("saved");
  }
  async function testConfiguration(target: "email"|"security"|"payment") {
    setTesting(true); setMessage("");
    const response = await fetch("/api/admin/settings/test",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({target})});
    const data = await response.json(); setMessage(data.message); setTesting(false); setState(response.ok?"saved":"error");
  }

  if (state === "loading") return <div className="settings-loading"><div className="skeleton skeleton-title"/><div className="skeleton settings-skeleton"/></div>;
  return <form className="settings-page" onSubmit={submit}>
    <div className="settings-intro"><div><p className="eyebrow">{section === "payment-settings" ? "Monetisasi" : "Konfigurasi"}</p><h2>{section === "payment-settings" ? "Pengaturan pembayaran" : "Pengaturan sistem"}</h2><p>Nilai rahasia dienkripsi dan tidak pernah ditampilkan kembali.</p></div><span className="settings-security"><LockKeyhole size={18}/> AES-256 encrypted</span></div>
    {groups.map(group => <section className="settings-section" key={group.title}>
      <div className="settings-section-head"><group.icon size={22}/><div><h3>{group.title}</h3><p>{group.description}</p></div></div>
      <div className="settings-fields">{group.keys.map(key => {
        const item = settings.find(setting => setting.key === key); if (!item) return null;
        const meta = labels[key] || { label: key, help: "" };
        return <label className="settings-field" key={key}><span className="settings-field-title">{meta.label}{item.configured && <small><CheckCircle2 size={13}/> Terhubung</small>}</span><span className="settings-help">{meta.help}</span>
          <div className="settings-input-wrap">{key === "PAYMENT_PROVIDER" ? <select value={values[key] || "pakasir"} onChange={event => setValues({...values,[key]:event.target.value})}><option value="pakasir">Pakasir</option><option value="midtrans">Midtrans</option><option value="xendit">Xendit</option></select> : <><input type={item.sensitive && !visible.has(key) ? "password" : "text"} autoComplete="off" placeholder={item.sensitive && item.configured ? "Tersimpan — isi untuk mengganti" : "Belum dikonfigurasi"} value={values[key] || ""} onChange={event => setValues({...values,[key]:event.target.value})}/>{item.sensitive && <button type="button" aria-label={visible.has(key)?"Sembunyikan nilai":"Tampilkan nilai"} onClick={() => setVisible(current => { const next=new Set(current); next.has(key)?next.delete(key):next.add(key); return next; })}>{visible.has(key)?<EyeOff size={18}/>:<Eye size={18}/>}</button>}</>}</div>
        </label>;
      })}</div>
    </section>)}
    <div className="settings-savebar"><div>{message || (dirty ? "Ada perubahan yang belum disimpan." : "Semua perubahan telah tersimpan.")}</div><div className="settings-save-actions">{section==="payment-settings"?<button type="button" className="btn btn-secondary" disabled={dirty||testing} onClick={()=>testConfiguration("payment")}>{testing?"Menguji…":"Uji payment"}</button>:<><button type="button" className="btn btn-secondary" disabled={dirty||testing} onClick={()=>testConfiguration("email")}>Uji SMTP</button><button type="button" className="btn btn-secondary" disabled={dirty||testing} onClick={()=>testConfiguration("security")}>Uji Turnstile</button></>}<button className="btn" disabled={!dirty || state === "saving"}><Save size={17}/>{state === "saving" ? "Menyimpan…" : "Simpan perubahan"}</button></div></div>
  </form>;
}
