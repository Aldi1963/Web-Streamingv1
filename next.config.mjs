/** @type {import('next').NextConfig} */
const mediaHosts = [
  "dramaboxdb.com",
  "*.dramaboxdb.com",
  "awscdn.netshort.com",
  "*.netshort.com",
  "*.crazymaplestudios.com",
  "*.yfeitrade.com",
  "*.goodreels.com",
  "*.shortswave.com",
  "*.aoneroom.com",
  "*.farsunpteltd.com",
  "*.tiktokcdn.com",
  "*.tiktokv.com",
  "*.byteicdn.com",
  "*.shorttv.live",
  "*.shorttv.app",
  "*.dramabos.my.id",
  "dramakuy.com",
  "*.dramakuy.com",
  "drakor.cc",
  "*.drakor.cc",
  "proxy.sonzaixlab.workers.dev",
  "*.montagehub.xyz",
  "assets.animekita.org",
  "animekita.org",
  "cdn.myanimelist.net",
  "myanimelist.net",
  "otakudesu.blog",
  "kuronime.sbs",
  "storage.animekita.org",
  "pixeldrain.com",
  "i0.wp.com",
  "i1.wp.com",
  "i2.wp.com",
  "i3.wp.com",
  "sjkt.animekita.org",
];

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://aasleeimg.yfeitrade.com https://acfs1.goodreels.com https://akamai-static.shorttv.live https://hwztchapter.dramaboxdb.com https://p16-novel-sg.ibyteimg.com https://p19-novel-sg.ibyteimg.com https://pbcdn.aoneroom.com https://s.shortswave.com https://static-v1.mydramawave.com https://static.shortswave.com https://v-img.crazymaplestudios.com https://v-mps.crazymaplestudios.com https://wsrv.nl https://zshipubcdn.farsunpteltd.com https://assets.animekita.org https://animekita.org https://cdn.myanimelist.net https://myanimelist.net https://otakudesu.blog https://kuronime.sbs https://storage.animekita.org https://sjkt.animekita.org https://pixeldrain.com https://i0.wp.com https://i1.wp.com https://i2.wp.com https://i3.wp.com",
  "font-src 'self' data:",
  `media-src 'self' blob: ${mediaHosts.map((host) => `https://${host}`).join(" ")}`,
  `connect-src 'self' ${mediaHosts.map((host) => `https://${host}`).join(" ")}`,
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: mediaHosts.map((hostname) => ({ protocol: "https", hostname })),
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-DNS-Prefetch-Control", value: "off" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Cross-Origin-Resource-Policy", value: "same-site" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Content-Security-Policy", value: contentSecurityPolicy },
    ];

    return [
      {
        source: "/provider-logos/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          ...securityHeaders,
        ],
      },
      {
        source: "/clipku-icon.svg",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          ...securityHeaders,
        ],
      },
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  }
};
export default nextConfig;
