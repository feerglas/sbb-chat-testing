# SBB Chat Playwright Test Automation

Automates manual SBB chatbot regression testing: send prompts from JSON, wait for AI responses, capture screenshots, and generate Confluence-ready reports.

Target environment: [https://conversational-ui-dev.app.sbb.ch/de/sbb-chat/](https://conversational-ui-dev.app.sbb.ch/de/sbb-chat/)

> **New here / non-developer?** See the step-by-step beginner guide for Windows: [GETTING_STARTED.md](GETTING_STARTED.md)

## Setup

```bash
npm install
```

Chromium is downloaded automatically into this project (`node_modules/playwright-core/.local-browsers`) via the `postinstall` script. No separate browser install step is needed.

## Run tests

```bash
# Headless (all enabled test cases)
npm test

# Watch in browser
npm run test:headed

# Playwright UI mode
npm run test:ui

# Run tests and generate reports
npm run test:full

# Re-run a single test case by id (e.g. after a timeout)
npm run test:case -- ab-standard-st-gallen-zuerich

# Re-run into an existing run folder (updates summary + reports)
npm run test:case -- ab-standard-st-gallen-zuerich --run 2026-08-20T11-16-43-386Z
```

Each test case runs in a **fresh chat session** by default.

## Reports

After a run, artifacts are written to `results/<run-id>/`:

| File | Purpose |
|------|---------|
| `summary.json` | Machine-readable run data |
| `report.md` | Confluence-ready Markdown table |
| `report.html` | Interactive local report with filters |
| `<test-id>/screenshot.png` | Full-page screenshot per case |
| `<test-id>/response.txt` | Extracted bot response text |
| `<test-id>/meta.json` | Per-case metadata including `chatSessionId` and `durationMs` |

Run folders use **local time**, e.g. `results/2026-08-20T13-37-45-123/`.

Reports include **Dauer** (per test), **Session ID** (`chat_session` cookie from the messages request), and run-level duration in the header.

Regenerate reports without re-running tests:

```bash
npm run report
npm run report:md
npm run report:html
npm run report -- --run 2026-08-20T12-00-00-000Z
```

## Manage test cases

Edit [`test-cases/test-cases.json`](test-cases/test-cases.json).

```json
{
  "id": "ab-standard-st-gallen-zuerich",
  "enabled": true,
  "category": "A–B-Verbindungen",
  "intention": "Standard A–B",
  "type": ["s", "u"],
  "prompt": "Ich will von St. Gallen nach Zürich fahren.",
  "notes": "Optional manual notes"
}
```

Type legend:

- `s` = short
- `l` = long
- `u` = unprecise
- `p` = precise
- `m` = extra mistakes
- `ch` = Swiss German

Set `"enabled": false` to skip a case. Append new cases using the same schema to grow beyond the reduced regression set.

## Configuration

In `test-cases.json` → `meta`:

| Field | Default | Description |
|-------|---------|-------------|
| `baseUrl` | dev chat URL | Chatbot entry point |
| `freshSessionPerTest` | `true` | Reload page before each case |
| `responseTimeoutMs` | `90000` | Max wait for bot reply |

Override base URL:

```bash
SBB_CHAT_URL=https://conversational-ui-dev.app.sbb.ch/de/sbb-chat/ npm test
```

## Project layout

```
test-cases/test-cases.json   # Test prompts and metadata
src/sbb-chat.page.ts         # Page object (selectors)
src/chat-runner.ts           # Run loop and artifact saving
tests/chat-scenarios.spec.ts # Playwright entry point
scripts/generate-report.ts   # report.md + report.html generator
results/                     # Output (gitignored)
```

## Notes

- Tests run **serially** to avoid overloading the dev chat backend.
- Responses are non-deterministic; this tool captures screenshots for human review, not automated assertions.
