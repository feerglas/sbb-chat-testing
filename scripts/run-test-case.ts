import { execFileSync } from 'node:child_process';
import testSuite from '../test-cases/test-cases.json';
import type { TestSuite } from '../src/types';

const suite = testSuite as TestSuite;

function printUsage(): void {
  console.error('Usage: npm run test:case -- <test-id> [--run <run-id>]');
  console.error('');
  console.error('Examples:');
  console.error('  npm run test:case -- ab-standard-st-gallen-zuerich');
  console.error('  npm run test:case -- ab-standard-st-gallen-zuerich --run 2026-08-20T11-16-43-386Z');
  console.error('');
  console.error('Available test ids:');
  for (const testCase of suite.testCases) {
    console.error(`  ${testCase.enabled ? ' ' : 'x'} ${testCase.id}`);
  }
}

const args = process.argv.slice(2);
const testId = args[0];
const runFlagIndex = args.indexOf('--run');
const runId = runFlagIndex >= 0 ? args[runFlagIndex + 1] : undefined;

if (!testId || testId.startsWith('-')) {
  printUsage();
  process.exit(1);
}

const testCase = suite.testCases.find((entry) => entry.id === testId);
if (!testCase) {
  console.error(`Unknown test id: ${testId}`);
  printUsage();
  process.exit(1);
}

if (!testCase.enabled) {
  console.warn(`Warning: test case "${testId}" is disabled in test-cases.json`);
}

const env: NodeJS.ProcessEnv = {
  ...process.env,
  PLAYWRIGHT_BROWSERS_PATH: '0',
  TEST_CASE_ID: testId,
};

if (runId) {
  env.SBB_CHAT_RUN_ID = runId;
}

console.log(`Running test case: ${testId}`);
if (runId) {
  console.log(`Updating run: ${runId}`);
}

execFileSync('npx', ['playwright', 'test'], {
  env,
  stdio: 'inherit',
});
