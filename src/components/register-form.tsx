"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";

export function RegisterForm({ redirectTo = "/dashboard" }: { redirectTo?: string }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const r = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    if (r.ok) location.href = `/login?redirect=${encodeURIComponent(redirectTo)}`;
    else setError((await r.json()).message);
    setLoading(false);
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>Buat Akun</h1>
        <p>Daftar sekarang dan nikmati streaming premium.</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label htmlFor="name">Nama</label>
            <input id="name" name="name" placeholder="Nama lengkap" required />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" placeholder="anda@email.com" required />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" placeholder="Minimal 8 karakter" minLength={8} required />
          </div>
          <div className="form-footer">
            <button type="submit" className="btn" disabled={loading}>
              <UserPlus size={18} /> {loading ? "Memproses..." : "Daftar"}
            </button>
            <Link href={`/login?redirect=${encodeURIComponent(redirectTo)}`} className="form-link">Sudah punya akun? Masuk</Link>
          </div>
        </form>
      </div>
    </main>
  );
}
