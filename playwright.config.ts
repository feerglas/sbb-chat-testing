import { defineConfig, devices } from '@playwright/test';
import testSuite from './test-cases/test-cases.json';
import type { TestSuite } from './src/types';

const suite = testSuite as TestSuite;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  timeout: 120_000,
  use: {
    baseURL: process.env.SBB_CHAT_URL ?? suite.meta.baseUrl,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    viewport: { width: 390, height: 844 },
    userAgent: devices['iPhone 13'].userAgent,
    isMobile: true,
    hasTouch: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { channel: undefined },
    },
  ],
});
