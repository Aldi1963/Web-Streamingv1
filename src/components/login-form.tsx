"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { LogIn, UserPlus } from "lucide-react";

export function LoginForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form)),
    });
    if (res.ok) {
      const redirect = new URLSearchParams(location.search).get("redirect");
      location.href = redirect?.startsWith("/") && !redirect.startsWith("//") ? redirect : "/dashboard";
    } else {
      setError((await res.json()).message);
    }
    setLoading(false);
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>Masuk</h1>
        <p>Selamat datang kembali! Silakan masuk ke akun Anda.</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" placeholder="anda@email.com" required />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" placeholder="Minimal 8 karakter" required minLength={8} />
          </div>
          <div className="form-footer">
            <button type="submit" className="btn" disabled={loading}>
              <LogIn size={18} /> {loading ? "Memproses..." : "Masuk"}
            </button>
            <Link href="/forgot-password" className="form-link">Lupa password?</Link>
          </div>
        </form>
        <div style={{ textAlign: "center", marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: "0 0 12px" }}>
            Belum punya akun?
          </p>
          <Link href="/register" className="btn btn-ghost" style={{ width: "100%", justifyContent: "center" }}>
            <UserPlus size={18} /> Daftar Sekarang
          </Link>
        </div>
      </div>
    </main>
  );
}
