function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

/** Local timestamp for results folder names, e.g. 2026-08-20T13-37-45-123 */
export function getLocalRunId(date = new Date()): string {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + 'T' + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
    pad(date.getMilliseconds(), 3),
  ].join('-');
}

/** Human-readable local datetime for reports, e.g. 20.08.2026 13:37:45 */
export function formatLocalDateTime(date: Date | string): string {
  const value = typeof date === 'string' ? new Date(date) : date;
  return [
    `${pad(value.getDate())}.${pad(value.getMonth() + 1)}.${value.getFullYear()}`,
    `${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`,
  ].join(' ');
}

export function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  return `${(durationMs / 1000).toFixed(1)}s`;
}

export function getRunDurationMs(startedAt: string, finishedAt: string): number | undefined {
  if (!finishedAt) {
    return undefined;
  }

  const duration = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  return duration >= 0 ? duration : undefined;
}
