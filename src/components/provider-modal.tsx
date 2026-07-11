"use client";

import { useState } from "react";
import Link from "next/link";

type Provider = {
  name: string;
  slug: string;
  count: number;
};

const COLORS = [
  "#e50914", "#6366f1", "#f59e0b", "#22c55e", "#ec4899",
  "#06b6d4", "#8b5cf6", "#f97316", "#14b8a6", "#e11d48",
  "#7c3aed", "#0891b2", "#dc2626", "#65a30d", "#d946ef",
];

function Avatar({ name, index }: { name: string; index: number }) {
  const letter = name.charAt(0).toUpperCase();
  const bg = COLORS[index % COLORS.length];
  return <span className="modal-avatar" style={{ background: bg }}>{letter}</span>;
}

export function ProviderModal({
  providers,
  current,
  preservedQuery,
}: {
  providers: Provider[];
  current?: string;
  preservedQuery?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = providers.find((p) => p.slug === current);
  const qs = preservedQuery ? `&${preservedQuery}` : "";

  return (
    <>
      <button onClick={() => setOpen(true)} className="modal-trigger">
        {selected ? (
          <>
            <Avatar name={selected.name} index={providers.findIndex(p => p.slug === selected.slug)} />
            <span>{selected.name}</span>
          </>
        ) : (
          <>
            <span className="modal-avatar" style={{ background: "var(--panel2)", fontSize: "1.2rem" }}>📡</span>
            <span>Pilih Platform</span>
          </>
        )}
        <span className="modal-arrow">▾</span>
      </button>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Pilih Platform</h3>
                <p className="modal-sub">{providers.length} platform tersedia</p>
              </div>
              <button onClick={() => setOpen(false)} className="modal-close">✕</button>
            </div>
            <div className="modal-grid modal-grid-4">
              {providers.sort((a, b) => b.count - a.count).map((p, i) => {
                const idx = providers.findIndex(x => x.slug === p.slug);
                return (
                  <Link
                    key={p.slug}
                    href={"/terbaru"}
                    className={`modal-tile${p.slug === current ? " active" : ""}`}
                    onClick={() => setOpen(false)}
                    prefetch={false}
                  >
                    <Avatar name={p.name} index={idx} />
                    <span className="modal-tile-name">{p.name.replace(" Short Drama", "").replace(" Short", "")}</span>
                    <span className="modal-tile-count">{p.count} drama</span>
                  </Link>
                );
              })}
            </div>
            {current && (
              <Link href="/terbaru" className="btn btn-sm" style={{ width: "100%", justifyContent: "center", marginTop: 12 }} prefetch={false}>
                Tampilkan Semua
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
