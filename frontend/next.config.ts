import type { NextConfig } from "next";

// `output: "standalone"` is a PRODUCTION-only packaging mode. Leaving it enabled
// for `next dev` triggers a known Node 22/24 + standalone fetch/cache memory
// leak (vercel/next.js#85914, #90433). Gate it to production builds only.
const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = isProduction ? { output: "standalone" } : {};

export default nextConfig;
