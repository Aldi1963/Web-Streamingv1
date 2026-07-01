import Link from "next/link";

export function AdminSectionTabs({ base, active, tabs }: {
  base: string;
  active: string;
  tabs: Array<[string, string]>;
}) {
  return <nav className="admin-section-tabs" aria-label="Submenu admin">
    {tabs.map(([value, label]) =>
      <Link key={value} href={`${base}?tab=${encodeURIComponent(value)}`} className={active === value ? "active" : ""}>
        {label}
      </Link>
    )}
  </nav>;
}
