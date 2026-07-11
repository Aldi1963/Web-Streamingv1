import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const mediaSources = [
  "https://*.dramaboxdb.com", "https://awscdn.netshort.com", "https://*.netshort.com",
  "https://*.crazymaplestudios.com", "https://*.yfeitrade.com", "https://*.goodreels.com",
  "https://*.shortswave.com", "https://*.aoneroom.com", "https://*.farsunpteltd.com",
  "https://*.tiktokcdn.com", "https://*.tiktokv.com", "https://*.byteicdn.com",
  "https://*.shorttv.live", "https://*.shorttv.app", "https://*.dramabos.my.id",
  "https://*.dramakuy.com", "https://*.mydramawave.com", "https://*.drakor.cc",
  "https://proxy.sonzaixlab.workers.dev", "https://*.montagehub.xyz", "https://*.hakunaymatata.com",
];

const imageSources = [
  ...mediaSources,
  "https://wsrv.nl", "https://assets.animekita.org", "https://animekita.org",
  "https://cdn.myanimelist.net", "https://myanimelist.net", "https://otakudesu.blog",
  "https://kuronime.sbs", "https://storage.animekita.org", "https://sjkt.animekita.org",
  "https://pixeldrain.com", "https://i0.wp.com", "https://i1.wp.com", "https://i2.wp.com", "https://i3.wp.com",
];

function contentSecurityPolicy(nonce: string) {
  return [
    "default-src 'self'", "base-uri 'self'", "frame-ancestors 'none'", "form-action 'self'",
    "object-src 'none'", `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'", `img-src 'self' data: blob: ${imageSources.join(" ")}`,
    "font-src 'self' data:", `media-src 'self' blob: ${mediaSources.join(" ")}`,
    `connect-src 'self' ${mediaSources.join(" ")}`, "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const policy = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  const { pathname } = request.nextUrl;

  if ((request.method === "GET" || request.method === "HEAD") && pathname === "/") {
    response.headers.set(
      "Cache-Control",
      "public, max-age=300, s-maxage=300, stale-while-revalidate=1800"
    );
  }

  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );

  // CORS for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    response.headers.set("Access-Control-Allow-Origin", process.env.APP_URL ?? "*");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );

    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: response.headers });
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
