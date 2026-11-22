import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The browser tests (npm run test:e2e) run their own dev server next to
  // yours, which Next only allows with a separate build folder.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  cacheComponents: true,
};

export default nextConfig;
