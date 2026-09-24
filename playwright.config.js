const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright Test Runner Configuration
 * Launches a standard, normal headed browser window (1280x800) on your monitor.
 */
module.exports = defineConfig({
  testDir: './tests',
  /* Maximum time one test can run for */
  timeout: 150000,
  expect: {
    timeout: 10000
  },
  /* Run tests concurrently across workers */
  fullyParallel: true,
  forbidOnly: false, // Let us use test.only for isolated reviews
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    trace: 'on-first-retry',
    /* Run browser in headless mode on CI, headed locally for developer comfort */
    headless: process.env.CI ? true : false,
    
    /* Ignore SSL certificate errors in demo/UAT environments */
    ignoreHTTPSErrors: true,
    
    // Map domains directly to their IP addresses to bypass flaky DNS resolution completely
    hosts: {
      'mtmb2.demo.markit.partners': '10.204.145.6',
      'mtmc2.demo.markit.partners': '10.204.145.7'
    },
    
    /* Let browser size dictate viewport size natively to prevent layout distortion */
    viewport: null,
    launchOptions: {
      args: [
        '--start-maximized',
        '--host-resolver-rules=MAP mtmb2.demo.markit.partners 10.204.145.6, MAP mtmc2.demo.markit.partners 10.204.145.7'
      ]
    },
    
    /* Action timeouts */
    actionTimeout: 30000,
    navigationTimeout: 60000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { 
        channel: 'chrome' // Launch standard, native Google Chrome
      },
    }
  ],
});
