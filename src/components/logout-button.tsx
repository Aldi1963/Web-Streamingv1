"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";

export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  return <button type="button" className="btn btn-ghost" style={{ width: "100%", justifyContent: "center", gap: 6 }} disabled={busy} onClick={async () => {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    location.href = "/";
  }}><LogOut size={17} /> {busy ? "Keluar…" : "Keluar"}</button>;
}
