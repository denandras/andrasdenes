import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      {
        pathname: "/**",
      },
      {
        pathname: "/api/media/file",
      },
    ],
  },
  // rec.andrasdenes.com lives on the same Vercel project (subdomain added
  // 2026-11-09) but should show the recording-services page, not the homepage.
  async redirects() {
    return [
      {
        source: "/",
        has: [{ type: "host", value: "rec.andrasdenes.com" }],
        destination: "https://andrasdenes.com/rec",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
