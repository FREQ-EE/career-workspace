import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/ui",
  workers: 1,
  retries: 0,
  timeout: 45000,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 1366, height: 768 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: process.env.CW_TEST_CHROMIUM
      ? {
          executablePath: process.env.CW_TEST_CHROMIUM,
          args: [
            "--no-sandbox",
            "--no-zygote",
            "--single-process",
            "--disable-gpu",
            "--disable-software-rasterizer",
          ],
        }
      : {},
  },
  webServer: {
    command: "node scripts/ui-server.mjs",
    url: "http://127.0.0.1:4173/api/app",
    reuseExistingServer: false,
    timeout: 30000,
  },
});
