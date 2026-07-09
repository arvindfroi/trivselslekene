import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/webp"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
    serverActions: {
      // Ny øvelse poster hovedbilde + inntil 20 fasebilder som base64
      // gjennom en server action før Blob-opplasting. Default 1 MB
      // knekker alt over ~3 bilder.
      bodySizeLimit: "8mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:file(favicon\\.ico|favicon\\.png|apple-touch-icon\\.png)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
