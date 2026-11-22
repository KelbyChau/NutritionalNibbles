// The pages the layout tests and screenshots visit, with whatever setup
// each needs (a recipe handed to the builder/chat, or the demo sign-in).
import type { Page } from "@playwright/test";
import { draftOf, seedDraft, waitForCatalog } from "./helpers";

export type PageSpec = { name: string; open: (page: Page) => Promise<void> };

export const pages: PageSpec[] = [
  { name: "landing", open: async (page) => { await page.goto("/"); } },
  {
    name: "builder",
    open: async (page) => {
      await seedDraft(page, draftOf("Lemon chicken & asparagus", 2));
      await page.goto("/optimize?draft=1");
      await waitForCatalog(page);
    },
  },
  {
    name: "chat",
    open: async (page) => {
      await seedDraft(page, draftOf("Lemon chicken & asparagus", 2));
      await page.goto("/optimize/chat");
      await waitForCatalog(page);
    },
  },
  {
    name: "dashboard",
    open: async (page) => {
      // The local database's seeded demo account (supabase/seed.sql).
      await page.goto("/auth/login");
      await page.fill("#email", "demo@example.com");
      await page.fill("#password", "demo-password");
      await page.getByRole("button", { name: "Login" }).click();
      await page.waitForURL(/\/dashboard/);
      await page.waitForLoadState("networkidle");
    },
  },
  { name: "login", open: async (page) => { await page.goto("/auth/login"); } },
];
