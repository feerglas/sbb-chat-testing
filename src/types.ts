export interface TestSuiteMeta {
  baseUrl: string;
  locale: string;
  freshSessionPerTest: boolean;
  responseTimeoutMs: number;
}

export interface TestCase {
  id: string;
  enabled: boolean;
  category: string;
  intention: string;
  type: string[];
  prompt: string;
  notes?: string;
}

export interface TestSuite {
  meta: TestSuiteMeta;
  testCases: TestCase[];
}

export type TestStatus = 'passed' | 'failed' | 'skipped';

export interface TestResult {
  id: string;
  category: string;
  intention: string;
  type: string[];
  prompt: string;
  notes?: string;
  status: TestStatus;
  responseText: string;
  screenshotPath: string;
  durationMs: number;
  chatSessionId?: string;
  error?: string;
  timestamp: string;
}

export interface RunSummary {
  runId: string;
  startedAt: string;
  finishedAt: string;
  baseUrl: string;
  playwrightVersion: string;
  results: TestResult[];
}
