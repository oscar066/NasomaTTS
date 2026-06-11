import type { NextConfig } from "next";

const API_URL = process.env.API_URL || "http://localhost:8000";

const nextConfig: NextConfig = {
  output: "standalone",
  // Proxy /api/* → FastAPI.
  // Only exclude the NextAuth-internal routes (session, csrf, providers,
  // callback, signin, signout, error, _log) — NOT /api/auth/signup or
  // /api/auth/me which must reach FastAPI.
  // In production nginx intercepts /api/ before reaching Next.js entirely.
  async rewrites() {
    return [
      {
        source: "/api/:path((?!auth\\/(?:session|csrf|providers|callback|signin|signout|error|_log)).*)",
        destination: `${API_URL}/:path*`,
      },
    ];
  },
  turbopack: {
    resolveAlias: {
      canvas: "./empty-module.js",
    },
  },
  // canvas is a native module not available in Docker — alias it to nothing
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
