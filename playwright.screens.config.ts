// Screenshot run (npm run screenshots): same server as the browser tests.
import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig({ ...base, testDir: "screens", timeout: 120_000 });
