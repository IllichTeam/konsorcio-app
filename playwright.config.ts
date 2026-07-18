import { defineConfig, devices } from "@playwright/test";

const target = (process.env.PERF_TARGET ?? "local") as "local" | "remote";
const localBaseURL = "http://localhost:3200";
const remoteBaseURL = (process.env.PERF_BASE_URL ?? process.env.BETTER_AUTH_URL ?? "")
  .trim()
  .replace(/\/$/, "");

if (target === "remote" && !remoteBaseURL) {
  throw new Error(
    "PERF_TARGET=remote requires PERF_BASE_URL or BETTER_AUTH_URL (e.g. via --env-file=.env.supabase).",
  );
}

if (target === "remote" && /localhost|127\.0\.0\.1/.test(remoteBaseURL)) {
  throw new Error(
    `PERF_TARGET=remote resolved to a local URL (${remoteBaseURL}). Set PERF_BASE_URL or BETTER_AUTH_URL to the deployed app.`,
  );
}

const baseURL = target === "remote" ? remoteBaseURL : localBaseURL;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: [["list"]],
  // Overridden per-test for remote (see happy-path.spec.ts). Local default 3 min.
  timeout: target === "remote" ? 600_000 : 180_000,
  expect: {
    timeout: target === "remote" ? 30_000 : 15_000,
  },
  use: {
    baseURL,
    trace: "off",
    video: "off",
    screenshot: "off",
  },
  metadata: {
    perfTarget: target,
    baseURL,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  ...(target === "local"
    ? {
        webServer: {
          command: "pnpm start",
          url: localBaseURL,
          reuseExistingServer: true,
          timeout: 120_000,
        },
      }
    : {}),
});
