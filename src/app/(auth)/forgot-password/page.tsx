"use client";

import { Mail, ArrowLeft } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal mengirim email.");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <main className="auth-page">
        <div className="auth-card success-state">
          <span className="icon"><Mail size={48} /></span>
          <h2>Email Terkirim!</h2>
          <p>Silakan cek inbox Anda untuk link reset password. Link berlaku 1 jam.</p>
          <Link href="/login" className="btn" style={{ display: "inline-block", marginTop: 16 }}>
            Kembali ke Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>Lupa Password</h1>
        <p>Masukkan email Anda, kami akan kirim link reset password.</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              placeholder="anda@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-footer">
            <button type="submit" className="btn" disabled={loading}>
              {loading ? "Mengirim..." : "Kirim Link Reset"}
            </button>
            <Link href="/login" className="form-link">
              <ArrowLeft size={14} style={{marginRight:4}} /> Kembali ke Login
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
