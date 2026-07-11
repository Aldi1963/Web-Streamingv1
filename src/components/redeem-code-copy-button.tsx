"use client";

import { useState } from "react";

export function RedeemCodeCopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard?.writeText(code).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button type="button" className="btn btn-sm" onClick={copy}>
      {copied ? "Tersalin" : "Salin kode"}
    </button>
  );
}
