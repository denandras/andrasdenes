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
  // /rec now lives on its own site. Keep the old URL working with a permanent
  // redirect instead of serving a stale copy of the page.
  async redirects() {
    return [
      {
        source: "/rec",
        destination: "https://rec.andrasdenes.com",
        permanent: true,
      },
      {
        source: "/rec/:path*",
        destination: "https://rec.andrasdenes.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
