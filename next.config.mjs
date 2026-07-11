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
