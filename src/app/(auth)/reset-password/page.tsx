"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function ResetPasswordForm() {
  const token = useSearchParams().get("token") || "";
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const body = await response.json();
    setLoading(false);
    if (!response.ok) return setError(body.message || "Reset password gagal.");
    setMessage(body.message);
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>Reset Password</h1>
        {message ? <><div className="alert">{message}</div><Link className="btn" href="/login">Login</Link></> : (
          <form onSubmit={submit}>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group">
              <label htmlFor="password">Password baru</label>
              <input id="password" type="password" minLength={8} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} />
            </div>
            <button className="btn" disabled={loading || token.length !== 64}>{loading ? "Menyimpan..." : "Simpan Password"}</button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
