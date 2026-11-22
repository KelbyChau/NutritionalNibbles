// Browser smoke tests for the main flows: npm run test:e2e
//
// They run against the LOCAL Supabase stack (Docker), never the shared
// project, on their own dev server (port 3100, build folder .next-e2e) so a
// dev server you already have running on :3000 isn't disturbed.
import { execSync } from "node:child_process";
import { defineConfig, devices } from "@playwright/test";

function localSupabase() {
  try {
    const out = execSync("npx --yes supabase@3.2.0 status -o json", { stdio: ["ignore", "pipe", "ignore"] });
    const status = JSON.parse(out.toString()) as { API_URL?: string; PUBLISHABLE_KEY?: string };
    if (status.API_URL && status.PUBLISHABLE_KEY) return status;
  } catch {}
  throw new Error("Start the local database first: npm run local");
}
const supabase = localSupabase();

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  workers: 1, // the specs share one local database
  use: { baseURL: "http://localhost:3100", ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } },
  webServer: {
    command: "npx next dev --webpack -p 3100",
    url: "http://localhost:3100/optimize",
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      NEXT_DIST_DIR: ".next-e2e",
      NEXT_PUBLIC_SUPABASE_URL: supabase.API_URL!,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabase.PUBLISHABLE_KEY!,
    },
  },
});
