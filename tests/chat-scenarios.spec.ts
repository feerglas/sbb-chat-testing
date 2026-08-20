import { execFileSync } from 'node:child_process';
import { test } from '@playwright/test';
import testSuite from '../test-cases/test-cases.json';
import {
  finalizeRunSummary,
  initRunSummary,
  loadEnabledTestCases,
  runChatTestCase,
} from '../src/chat-runner';
import type { TestSuite } from '../src/types';

const suite = testSuite as TestSuite;
const caseIdFilter = process.env.TEST_CASE_ID;
const enabledTestCases = loadEnabledTestCases(suite).filter(
  (testCase) => !caseIdFilter || testCase.id === caseIdFilter,
);

if (caseIdFilter && enabledTestCases.length === 0) {
  throw new Error(`No enabled test case found with id: ${caseIdFilter}`);
}

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  await initRunSummary(suite);
});

test.afterAll(async () => {
  await finalizeRunSummary();
  execFileSync('npm', ['run', 'report'], {
    stdio: 'inherit',
    // Windows resolves npm via npm.cmd, which requires a shell.
    shell: process.platform === 'win32',
  });
});

for (const testCase of enabledTestCases) {
  test(testCase.id, async ({ page }) => {
    await runChatTestCase(page, suite, testCase);
  });
}
