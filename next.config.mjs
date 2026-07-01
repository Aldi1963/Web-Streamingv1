/** @type {import('next').NextConfig} */
const imageHosts = [
  "aasleeimg.yfeitrade.com",
  "acfs1.goodreels.com",
  "akamai-static.shorttv.live",
  "hwztchapter.dramaboxdb.com",
  "p16-novel-sg.ibyteimg.com",
  "p19-novel-sg.ibyteimg.com",
  "pbcdn.aoneroom.com",
  "s.shortswave.com",
  "static-v1.mydramawave.com",
  "static.shortswave.com",
  "v-img.crazymaplestudios.com",
  "v-mps.crazymaplestudios.com",
  "wsrv.nl",
  "zshipubcdn.farsunpteltd.com",
];

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${imageHosts.map((host) => `https://${host}`).join(" ")}`,
  "font-src 'self' data:",
  "media-src 'self' blob: https://*.dramaboxdb.com https://*.netshort.com",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: imageHosts.map((hostname) => ({ protocol: "https", hostname })),
  },
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Content-Security-Policy", value: contentSecurityPolicy }
      ]
    }];
  }
};
export default nextConfig;
