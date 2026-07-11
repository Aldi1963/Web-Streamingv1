"use client";

import { CheckCircle2, ChevronDown, ClipboardCopy, Eye, EyeOff, LockKeyhole, Mail, Save, ShieldCheck, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Setting = { key: string; value: string; sensitive: boolean; configured: boolean };
type Group = { title: string; description: string; icon: typeof Mail; keys: string[] };

const labels: Record<string, { label: string; help: string }> = {
  PAYMENT_PROVIDER: { label: "Gateway aktif", help: "Gateway yang digunakan saat pengguna membuat pembayaran." },
  ALDIQRIS_API_KEY: { label: "AldiQRIS API key", help: "Bearer token dari dashboard AldiQRIS." },
  ALDIQRIS_BASE_URL: { label: "AldiQRIS API URL", help: "Default: https://aldiqris.pages.dev/api" },
  CLIPKU_PAY_API_KEY: { label: "Pay Clipku API key", help: "Bearer token dari dashboard pay.clipku.com." },
  CLIPKU_PAY_BASE_URL: { label: "Pay Clipku API URL", help: "Default: https://pay.clipku.com/api" },
  CLIPKU_PAY_WEBHOOK_SECRET: { label: "Pay Clipku webhook secret", help: "Opsional. Jika kosong, API key dipakai untuk validasi HMAC webhook." },
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
  PAYMENT_TIMEOUT_MINUTES: { label: "Batas waktu pembayaran", help: "Durasi invoice pending sebelum otomatis ditandai gagal, dalam menit." },
};

const paymentGroups: Group[] = [
  { title: "Gateway pembayaran", description: "Pilih provider aktif dan konfigurasi kredensialnya.", icon: WalletCards, keys: ["PAYMENT_PROVIDER","PAYMENT_TIMEOUT_MINUTES","ALDIQRIS_API_KEY","ALDIQRIS_BASE_URL","CLIPKU_PAY_API_KEY","CLIPKU_PAY_BASE_URL","CLIPKU_PAY_WEBHOOK_SECRET","PAKASIR_API_KEY","PAKASIR_SLUG","MIDTRANS_SERVER_KEY","MIDTRANS_CLIENT_KEY","XENDIT_SECRET_KEY"] },
];
const paymentDropdowns = [
  { title: "Umum", description: "Provider aktif dan batas waktu invoice.", keys: ["PAYMENT_PROVIDER","PAYMENT_TIMEOUT_MINUTES"] },
  { title: "Pay Clipku", description: "Gateway pay.clipku.com dan webhook otomatis.", provider: "clipku_pay", keys: ["CLIPKU_PAY_API_KEY","CLIPKU_PAY_BASE_URL","CLIPKU_PAY_WEBHOOK_SECRET"] },
  { title: "AldiQRIS", description: "QRIS dan webhook otomatis.", provider: "aldiqris", keys: ["ALDIQRIS_API_KEY","ALDIQRIS_BASE_URL"] },
  { title: "Pakasir", description: "Payment link dan slug proyek.", provider: "pakasir", keys: ["PAKASIR_API_KEY","PAKASIR_SLUG"] },
  { title: "Midtrans", description: "Server key dan client key.", provider: "midtrans", keys: ["MIDTRANS_SERVER_KEY","MIDTRANS_CLIENT_KEY"] },
  { title: "Xendit", description: "Secret key API Xendit.", provider: "xendit", keys: ["XENDIT_SECRET_KEY"] },
];
const paymentProviders = [
  { value: "clipku_pay", label: "Pay Clipku" },
  { value: "aldiqris", label: "AldiQRIS" },
  { value: "pakasir", label: "Pakasir" },
  { value: "midtrans", label: "Midtrans" },
  { value: "xendit", label: "Xendit" },
];
const systemGroups: Group[] = [
  { title: "Email sistem", description: "Konfigurasi SMTP untuk verifikasi, invoice, dan notifikasi.", icon: Mail, keys: ["MAIL_HOST","MAIL_PORT","MAIL_USERNAME","MAIL_PASSWORD","MAIL_FROM_ADDRESS"] },
  { title: "Keamanan & otomasi", description: "Perlindungan bot dan akses proses terjadwal.", icon: ShieldCheck, keys: ["CLOUDFLARE_TURNSTILE_SITE_KEY","CLOUDFLARE_TURNSTILE_SECRET_KEY","CRON_SECRET"] },
];

export function AdminSettingsForm({
  section = "settings",
  webhookUrl = "/api/payments/aldiqris/webhook",
  clipkuPayWebhookUrl = "/api/payments/clipku-pay/webhook",
}: {
  section?: string;
  webhookUrl?: string;
  clipkuPayWebhookUrl?: string;
}) {
  const groups = section === "payment-settings" ? paymentGroups : systemGroups;
  const allowed = useMemo(() => new Set(groups.flatMap(group => group.keys)), [groups]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [initial, setInitial] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Set<string>>(new Set());
  const [state, setState] = useState<"loading"|"idle"|"saving"|"saved"|"error">("loading");
  const [message, setMessage] = useState("");
  const [testing, setTesting] = useState(false);
  const [webhookCopied, setWebhookCopied] = useState(false);

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
  const activeProvider = values.PAYMENT_PROVIDER || "pakasir";
  const renderField = (key: string) => {
    const item = settings.find(setting => setting.key === key); if (!item) return null;
    const meta = labels[key] || { label: key, help: "" };
    return <label className="settings-field" key={key}><span className="settings-field-title">{meta.label}{item.configured && <small><CheckCircle2 size={13}/> Terhubung</small>}</span><span className="settings-help">{meta.help}</span>
      <div className="settings-input-wrap">{key === "PAYMENT_PROVIDER" ? <select value={activeProvider} onChange={event => setValues({...values,[key]:event.target.value})}><option value="clipku_pay">Pay Clipku</option><option value="aldiqris">AldiQRIS</option><option value="pakasir">Pakasir</option><option value="midtrans">Midtrans</option><option value="xendit">Xendit</option></select> : <><input type={key === "PAYMENT_TIMEOUT_MINUTES" ? "number" : item.sensitive && !visible.has(key) ? "password" : "text"} min={key === "PAYMENT_TIMEOUT_MINUTES" ? 5 : undefined} max={key === "PAYMENT_TIMEOUT_MINUTES" ? 1440 : undefined} autoComplete="off" placeholder={item.sensitive && item.configured ? "Tersimpan - isi untuk mengganti" : "Belum dikonfigurasi"} value={values[key] || ""} onChange={event => setValues({...values,[key]:event.target.value})}/>{item.sensitive && <button type="button" aria-label={visible.has(key)?"Sembunyikan nilai":"Tampilkan nilai"} onClick={() => setVisible(current => { const next=new Set(current); next.has(key)?next.delete(key):next.add(key); return next; })}>{visible.has(key)?<EyeOff size={18}/>:<Eye size={18}/>}</button>}</>}</div>
    </label>;
  };
  const renderWebhookField = (title: string, help: string, url: string) => <label className="settings-field settings-field-wide"><span className="settings-field-title">{title}</span><span className="settings-help">{help}</span>
    <div className="settings-input-wrap"><input type="text" readOnly value={url}/><button type="button" aria-label="Salin URL webhook" onClick={async () => { await navigator.clipboard.writeText(url); setWebhookCopied(true); window.setTimeout(() => setWebhookCopied(false), 2000); }}><ClipboardCopy size={18}/></button></div>
    {webhookCopied && <small><CheckCircle2 size={13}/> URL berhasil disalin</small>}
  </label>;
  const aldiQrisWebhookField = renderWebhookField("URL webhook AldiQRIS", "Masukkan URL ini sebagai target webhook di gateway AldiQRIS.", webhookUrl);
  const clipkuPayWebhookField = renderWebhookField("URL webhook Pay Clipku", "Masukkan URL ini sebagai target webhook di dashboard pay.clipku.com.", clipkuPayWebhookUrl);
  return <form className="settings-page" onSubmit={submit}>
    <div className="settings-intro"><div><p className="eyebrow">{section === "payment-settings" ? "Monetisasi" : "Konfigurasi"}</p><h2>{section === "payment-settings" ? "Pengaturan pembayaran" : "Pengaturan sistem"}</h2><p>Nilai rahasia dienkripsi dan tidak pernah ditampilkan kembali.</p></div><span className="settings-security"><LockKeyhole size={18}/> AES-256 encrypted</span></div>
    {section === "payment-settings" && <section className="settings-section payment-settings-panel">
      <div className="settings-section-head"><WalletCards size={22}/><div><h3>Gateway pembayaran</h3><p>Pilih gateway aktif, lalu buka dropdown provider yang ingin dikonfigurasi.</p></div></div>
      <div className="payment-provider-picker" aria-label="Gateway aktif">
        {paymentProviders.map(provider => <button type="button" key={provider.value} className={activeProvider === provider.value ? "active" : ""} onClick={() => setValues({...values,PAYMENT_PROVIDER:provider.value})}>
          <span>{provider.label}</span>
          {activeProvider === provider.value && <small>Aktif</small>}
        </button>)}
      </div>
      <div className="payment-dropdown-list">
        {paymentDropdowns.map(group => {
          const active = group.provider === activeProvider || group.title === "Umum";
          return <details className="payment-dropdown" key={group.title} open={active}>
            <summary><span><strong>{group.title}</strong><small>{group.description}</small></span>{group.provider === activeProvider && <em>Aktif</em>}<ChevronDown size={17}/></summary>
            <div className="settings-fields payment-settings-fields">
              {group.keys.map(renderField)}
              {group.provider === "aldiqris" && aldiQrisWebhookField}
              {group.provider === "clipku_pay" && clipkuPayWebhookField}
            </div>
          </details>;
        })}
      </div>
    </section>}
    {section !== "payment-settings" && groups.map(group => <section className="settings-section" key={group.title}>
      <div className="settings-section-head"><group.icon size={22}/><div><h3>{group.title}</h3><p>{group.description}</p></div></div>
      <div className="settings-fields">{group.keys.map(key => {
        return renderField(key);
      })}</div>
    </section>)}
    <div className="settings-savebar"><div>{message || (dirty ? "Ada perubahan yang belum disimpan." : "Semua perubahan telah tersimpan.")}</div><div className="settings-save-actions">{section==="payment-settings"?<button type="button" className="btn btn-secondary" disabled={dirty||testing} onClick={()=>testConfiguration("payment")}>{testing?"Menguji…":"Uji payment"}</button>:<><button type="button" className="btn btn-secondary" disabled={dirty||testing} onClick={()=>testConfiguration("email")}>Uji SMTP</button><button type="button" className="btn btn-secondary" disabled={dirty||testing} onClick={()=>testConfiguration("security")}>Uji Turnstile</button></>}<button className="btn" disabled={!dirty || state === "saving"}><Save size={17}/>{state === "saving" ? "Menyimpan…" : "Simpan perubahan"}</button></div></div>
  </form>;
}
