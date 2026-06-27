import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

config({ path: resolve(__dirname, ".env.test") });

// Allow reusing already-running dev servers (e.g. when running locally with `bun run dev`)
const reuseExistingServer = process.env.CI !== "true";

// Build env vars for the server process from .env.test values already loaded above
const serverEnv = [
  `DATABASE_URL=${process.env.DATABASE_URL}`,
  `BETTER_AUTH_SECRET=${process.env.BETTER_AUTH_SECRET}`,
  `BETTER_AUTH_URL=${process.env.BETTER_AUTH_URL}`,
  `PORT=4000`,
].join(" ");

const ROOT = resolve(__dirname, "..");

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./global-setup.ts",
  fullyParallel: false,
  retries: 1,
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:5173",
    trace: "on-first-retry",
  },
  webServer: [
    {
      // Express server started with test DATABASE_URL injected inline
      command: `env ${serverEnv} bun run --cwd ${ROOT} dev:server`,
      url: "http://localhost:4000/api/health",
      reuseExistingServer,
      timeout: 30_000,
    },
    {
      command: `bun run --cwd ${ROOT} dev:web`,
      url: "http://localhost:5173",
      reuseExistingServer,
      timeout: 30_000,
    },
  ],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
