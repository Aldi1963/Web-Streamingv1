import Link from "next/link";
import type { ReactNode } from "react";

type CatalogProviderLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
  "aria-current"?: "page";
};

export function CatalogProviderLink({
  href,
  className,
  children,
  "aria-current": ariaCurrent,
}: CatalogProviderLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      aria-current={ariaCurrent}
      prefetch={false}
    >
      {children}
    </Link>
  );
}
