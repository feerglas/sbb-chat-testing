import fs from 'node:fs/promises';
import path from 'node:path';
import { version as playwrightVersion } from '@playwright/test/package.json';
import type { Page } from '@playwright/test';
import { SbbChatPage } from './sbb-chat.page';
import type { RunSummary, TestCase, TestResult, TestSuite } from './types';

const RESULTS_DIR = path.join(process.cwd(), 'results');

export function getRunId(): string {
  const envRunId = process.env.SBB_CHAT_RUN_ID;
  if (envRunId) {
    return envRunId;
  }

  return new Date().toISOString().replace(/[:.]/g, '-');
}

export function getRunDir(runId = getRunId()): string {
  return path.join(RESULTS_DIR, runId);
}

async function readSummary(runDir: string): Promise<RunSummary | null> {
  try {
    const raw = await fs.readFile(path.join(runDir, 'summary.json'), 'utf8');
    return JSON.parse(raw) as RunSummary;
  } catch {
    return null;
  }
}

async function writeSummary(runDir: string, summary: RunSummary): Promise<void> {
  await fs.mkdir(runDir, { recursive: true });
  await fs.writeFile(path.join(runDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
}

export async function initRunSummary(suite: TestSuite, runId = getRunId()): Promise<RunSummary> {
  const runDir = getRunDir(runId);
  await fs.mkdir(runDir, { recursive: true });

  const existing = await readSummary(runDir);
  if (existing) {
    return existing;
  }

  const summary: RunSummary = {
    runId,
    startedAt: new Date().toISOString(),
    finishedAt: '',
    baseUrl: process.env.SBB_CHAT_URL ?? suite.meta.baseUrl,
    playwrightVersion,
    results: [],
  };

  await writeSummary(runDir, summary);
  process.env.SBB_CHAT_RUN_ID = runId;
  return summary;
}

export async function finalizeRunSummary(runId = getRunId()): Promise<RunSummary> {
  const runDir = getRunDir(runId);
  const summary = await readSummary(runDir);

  if (!summary) {
    throw new Error(`Missing summary.json for run ${runId}`);
  }

  summary.finishedAt = new Date().toISOString();
  await writeSummary(runDir, summary);
  return summary;
}

export async function runChatTestCase(
  page: Page,
  suite: TestSuite,
  testCase: TestCase,
  runId = getRunId(),
): Promise<TestResult> {
  const runDir = getRunDir(runId);
  const testDir = path.join(runDir, testCase.id);
  const screenshotPath = path.join(testDir, 'screenshot.png');
  const responsePath = path.join(testDir, 'response.txt');
  const metaPath = path.join(testDir, 'meta.json');
  const startedAt = Date.now();
  const chat = new SbbChatPage(page);
  const baseUrl = process.env.SBB_CHAT_URL ?? suite.meta.baseUrl;

  const baseResult: Omit<TestResult, 'status' | 'responseText' | 'durationMs' | 'timestamp'> = {
    id: testCase.id,
    category: testCase.category,
    intention: testCase.intention,
    type: testCase.type,
    prompt: testCase.prompt,
    notes: testCase.notes,
    screenshotPath: path.relative(runDir, screenshotPath),
  };

  try {
    if (suite.meta.freshSessionPerTest) {
      await chat.goto(baseUrl);
      await chat.startFreshSession();
    } else {
      await chat.ensureActiveSession();
    }

    const previousCount = await chat.sendMessage(testCase.prompt);
    const responseText = await chat.waitForBotResponse(
      previousCount,
      suite.meta.responseTimeoutMs,
    );

    await fs.mkdir(testDir, { recursive: true });
    await chat.screenshotFullPage(screenshotPath);
    await fs.writeFile(responsePath, responseText, 'utf8');

    const result: TestResult = {
      ...baseResult,
      status: 'passed',
      responseText,
      durationMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    };

    await fs.writeFile(metaPath, JSON.stringify(result, null, 2), 'utf8');
    await appendResult(runId, result);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await fs.mkdir(testDir, { recursive: true });

    if (await page.locator('.main-content').isVisible().catch(() => false)) {
      await chat.screenshotFullPage(screenshotPath).catch(() => undefined);
    }

    const result: TestResult = {
      ...baseResult,
      status: 'failed',
      responseText: '',
      durationMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
      error: message,
      screenshotPath: (await fs
        .access(screenshotPath)
        .then(() => path.relative(runDir, screenshotPath))
        .catch(() => '')) as string,
    };

    await fs.writeFile(metaPath, JSON.stringify(result, null, 2), 'utf8');
    await appendResult(runId, result);
    throw error;
  }
}

async function appendResult(runId: string, result: TestResult): Promise<void> {
  const runDir = getRunDir(runId);
  const summary = await readSummary(runDir);

  if (!summary) {
    throw new Error(`Missing summary.json for run ${runId}`);
  }

  const existingIndex = summary.results.findIndex((entry) => entry.id === result.id);
  if (existingIndex >= 0) {
    summary.results[existingIndex] = result;
  } else {
    summary.results.push(result);
  }

  await writeSummary(runDir, summary);
}

export function loadEnabledTestCases(suite: TestSuite): TestCase[] {
  return suite.testCases.filter((testCase) => testCase.enabled);
}
