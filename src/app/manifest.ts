import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Clipku Streaming",
    short_name: "Clipku+",
    description: "Streaming drama pilihan dari berbagai provider.",
    start_url: "/",
    display: "standalone",
    background_color: "#05070b",
    theme_color: "#e50914",
    orientation: "any",
    icons: [
      {
        src: "/clipku-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/clipku-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
