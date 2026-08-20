import fs from 'node:fs/promises';
import path from 'node:path';
import { formatDuration, formatLocalDateTime, getRunDurationMs } from '../src/datetime';
import type { RunSummary, TestResult } from '../src/types';

const RESULTS_DIR = path.join(process.cwd(), 'results');

function escapeMarkdown(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatType(type: string[]): string {
  return type.join(', ');
}

function formatSessionId(sessionId?: string): string {
  return sessionId ?? '_not captured_';
}

function formatAntwortCell(result: TestResult): string {
  const screenshotPart = result.screenshotPath
    ? `![${result.id}](${result.screenshotPath})`
    : '_No screenshot_';
  const responsePart = result.responseText
    ? escapeMarkdown(result.responseText)
    : result.error
      ? escapeMarkdown(result.error)
      : '_No response captured_';

  return `${screenshotPart}<br><br>${responsePart}`;
}

function buildMarkdownReport(summary: RunSummary): string {
  const passed = summary.results.filter((result) => result.status === 'passed').length;
  const failed = summary.results.filter((result) => result.status === 'failed').length;
  const runDurationMs = getRunDurationMs(summary.startedAt, summary.finishedAt);

  const header = [
    '# SBB Chat Test Report',
    '',
    `- Run ID: \`${summary.runId}\``,
    `- Started: ${formatLocalDateTime(summary.startedAt)}`,
    `- Finished: ${summary.finishedAt ? formatLocalDateTime(summary.finishedAt) : 'in progress'}`,
    `- Run duration: ${runDurationMs !== undefined ? formatDuration(runDurationMs) : 'in progress'}`,
    `- Base URL: ${summary.baseUrl}`,
    `- Playwright: ${summary.playwrightVersion}`,
    `- Results: ${passed} passed, ${failed} failed, ${summary.results.length} total`,
    '',
    '| Kategorie | Intention | Type | Prompt | Dauer | Session ID | Antwort |',
    '|-----------|-----------|------|--------|-------|------------|---------|',
  ];

  const rows = summary.results.map((result) => {
    return [
      escapeMarkdown(result.category),
      escapeMarkdown(result.intention),
      formatType(result.type),
      escapeMarkdown(result.prompt),
      formatDuration(result.durationMs),
      escapeMarkdown(formatSessionId(result.chatSessionId)),
      formatAntwortCell(result),
    ].join(' | ');
  });

  return [...header, ...rows.map((row) => `| ${row} |`), ''].join('\n');
}

function buildHtmlReport(summary: RunSummary): string {
  const categories = [...new Set(summary.results.map((result) => result.category))];
  const passed = summary.results.filter((result) => result.status === 'passed').length;
  const failed = summary.results.filter((result) => result.status === 'failed').length;
  const runDurationMs = getRunDurationMs(summary.startedAt, summary.finishedAt);

  const rows = summary.results
    .map((result) => {
      const screenshotHtml = result.screenshotPath
        ? `<a href="${escapeHtml(result.screenshotPath)}" target="_blank" rel="noopener">
             <img src="${escapeHtml(result.screenshotPath)}" alt="${escapeHtml(result.id)}" class="thumb" />
           </a>`
        : '<em>No screenshot</em>';

      const responseHtml = result.responseText
        ? `<pre>${escapeHtml(result.responseText)}</pre>`
        : result.error
          ? `<pre class="error">${escapeHtml(result.error)}</pre>`
          : '<em>No response captured</em>';

      return `<tr data-category="${escapeHtml(result.category)}">
        <td>${escapeHtml(result.category)}</td>
        <td>${escapeHtml(result.intention)}</td>
        <td>${escapeHtml(formatType(result.type))}</td>
        <td>${escapeHtml(result.prompt)}</td>
        <td>${escapeHtml(formatDuration(result.durationMs))}</td>
        <td><code>${escapeHtml(formatSessionId(result.chatSessionId))}</code></td>
        <td class="answer">${screenshotHtml}${responseHtml}</td>
        <td>${escapeHtml(formatLocalDateTime(result.timestamp))}</td>
        <td class="status-${escapeHtml(result.status)}">${escapeHtml(result.status)}</td>
      </tr>`;
    })
    .join('\n');

  const filterOptions = categories
    .map(
      (category) =>
        `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`,
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SBB Chat Test Report - ${escapeHtml(summary.runId)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 24px; color: #222; }
    h1 { margin-bottom: 8px; }
    .meta { margin-bottom: 20px; color: #555; }
    .controls { margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #ddd; padding: 10px; vertical-align: top; text-align: left; overflow-wrap: break-word; }
    th { background: #f5f5f5; position: sticky; top: 0; }
    td code { word-break: break-all; font-size: 0.85em; }
    .answer pre { white-space: pre-wrap; word-break: break-word; margin-top: 8px; background: #fafafa; padding: 8px; border-radius: 6px; }
    .answer pre.error { background: #fff1f0; color: #a8071a; }
    .thumb { max-width: 220px; border: 1px solid #ddd; border-radius: 8px; cursor: zoom-in; }
    .status-passed { color: #237804; font-weight: 600; }
    .status-failed { color: #a8071a; font-weight: 600; }
    .status-skipped { color: #8c8c8c; font-weight: 600; }
  </style>
</head>
<body>
  <h1>SBB Chat Test Report</h1>
  <div class="meta">
    <div><strong>Run ID:</strong> ${escapeHtml(summary.runId)}</div>
    <div><strong>Started:</strong> ${escapeHtml(formatLocalDateTime(summary.startedAt))}</div>
    <div><strong>Finished:</strong> ${escapeHtml(summary.finishedAt ? formatLocalDateTime(summary.finishedAt) : 'in progress')}</div>
    <div><strong>Run duration:</strong> ${escapeHtml(runDurationMs !== undefined ? formatDuration(runDurationMs) : 'in progress')}</div>
    <div><strong>Base URL:</strong> ${escapeHtml(summary.baseUrl)}</div>
    <div><strong>Playwright:</strong> ${escapeHtml(summary.playwrightVersion)}</div>
    <div><strong>Results:</strong> ${passed} passed, ${failed} failed, ${summary.results.length} total</div>
  </div>
  <div class="controls">
    <label for="categoryFilter">Filter by category:</label>
    <select id="categoryFilter">
      <option value="">All categories</option>
      ${filterOptions}
    </select>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 10%">Kategorie</th>
        <th style="width: 10%">Intention</th>
        <th style="width: 6%">Type</th>
        <th style="width: 16%">Prompt</th>
        <th style="width: 6%">Dauer</th>
        <th style="width: 14%">Session ID</th>
        <th style="width: 24%">Antwort</th>
        <th style="width: 8%">Ausgeführt</th>
        <th style="width: 6%">Status</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <script>
    const filter = document.getElementById('categoryFilter');
    filter.addEventListener('change', () => {
      const value = filter.value;
      document.querySelectorAll('tbody tr').forEach((row) => {
        row.style.display = !value || row.dataset.category === value ? '' : 'none';
      });
    });
  </script>
</body>
</html>`;
}

async function findLatestRunDir(): Promise<string> {
  const entries = await fs.readdir(RESULTS_DIR, { withFileTypes: true }).catch(() => []);
  const runDirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

  if (runDirs.length === 0) {
    throw new Error('No results found. Run `npm test` first.');
  }

  const summaries = await Promise.all(
    runDirs.map(async (runId) => {
      const summaryPath = path.join(RESULTS_DIR, runId, 'summary.json');
      try {
        const stat = await fs.stat(summaryPath);
        return { runId, mtime: stat.mtimeMs };
      } catch {
        return null;
      }
    }),
  );

  const latest = summaries
    .filter((entry): entry is { runId: string; mtime: number } => entry !== null)
    .sort((a, b) => b.mtime - a.mtime)[0];

  if (!latest) {
    throw new Error('No summary.json found in results/. Run `npm test` first.');
  }

  return path.join(RESULTS_DIR, latest.runId);
}

function parseArgs(argv: string[]): { runDir?: string; format: 'both' | 'md' | 'html' } {
  let runDir: string | undefined;
  let format: 'both' | 'md' | 'html' = 'both';

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--run' && argv[index + 1]) {
      runDir = path.join(RESULTS_DIR, argv[index + 1]);
      index += 1;
    } else if (arg === '--format' && argv[index + 1]) {
      const value = argv[index + 1];
      if (value === 'md' || value === 'html' || value === 'both') {
        format = value;
      }
      index += 1;
    }
  }

  return { runDir, format };
}

async function main(): Promise<void> {
  const { runDir: requestedRunDir, format } = parseArgs(process.argv.slice(2));
  const runDir = requestedRunDir ?? (await findLatestRunDir());
  const summaryPath = path.join(runDir, 'summary.json');
  const raw = await fs.readFile(summaryPath, 'utf8');
  const summary = JSON.parse(raw) as RunSummary;

  if (format === 'both' || format === 'md') {
    await fs.writeFile(path.join(runDir, 'report.md'), buildMarkdownReport(summary), 'utf8');
  }

  if (format === 'both' || format === 'html') {
    await fs.writeFile(path.join(runDir, 'report.html'), buildHtmlReport(summary), 'utf8');
  }

  console.log(`Reports written to ${runDir}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
