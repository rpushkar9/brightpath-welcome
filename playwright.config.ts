import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5199',
    ...devices['Desktop Chrome'],
    // Uses the installed Chrome, so running the tests needs no browser download.
    channel: 'chrome',
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: 'npx vite --port 5199 --strictPort',
    url: 'http://localhost:5199',
    reuseExistingServer: false,
  },
})
