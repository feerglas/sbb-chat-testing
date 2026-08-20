# Getting Started (Windows)

This guide walks you through everything you need to run the SBB Chat tests on a Windows laptop — no prior developer experience needed.

**What this project does:** It automatically opens the [SBB dev chatbot](https://conversational-ui-dev.app.sbb.ch/de/sbb-chat/), sends each test question from our test set, waits for the answer, takes a screenshot of question + answer, and creates a report you can review or paste into Confluence.

Time needed for the first setup: about **15–20 minutes** (mostly waiting for downloads).

---

## 1. Install the required programs (one time only)

You need two free programs: **Git** (to download the project) and **Node.js** (to run the tests).

### 1a. Install Git

1. Go to [https://git-scm.com/download/win](https://git-scm.com/download/win)
2. The download starts automatically. Run the installer.
3. You will see many option pages — you can simply click **Next** on every page, then **Install**, then **Finish**. The default settings are fine.

### 1b. Install Node.js

1. Go to [https://nodejs.org](https://nodejs.org)
2. Download the **LTS** version (the button on the left, "recommended for most users").
3. Run the installer and click **Next** through all pages, then **Install**. The default settings are fine. You do **not** need to tick "Automatically install the necessary tools".

### 1c. Check that everything is installed

1. Press the **Windows key**, type `powershell`, and press **Enter**. A blue window opens — this is the *terminal* where you will type commands.
2. Type the following command and press Enter:

```powershell
git --version
```

You should see something like `git version 2.47.0`.

3. Then type:

```powershell
node --version
```

You should see something like `v22.14.0`.

If either command says *"is not recognized"*, close the PowerShell window, open a new one, and try again. If it still fails, restart your laptop once (the installers sometimes need this).

---

## 2. Download the project (one time only)

1. Open PowerShell (Windows key → type `powershell` → Enter).
2. Go to your user folder (or wherever you want the project to live):

```powershell
cd $HOME\Documents
```

3. Download ("clone") the project. **Replace the URL below with the real repository URL** you received from the team:

```powershell
git clone <REPOSITORY-URL>
```

If the repository is private, a login window may pop up — sign in with your account.

4. Enter the project folder:

```powershell
cd sbb-chat-testing
```

---

## 3. Install the project (one time only)

Still in PowerShell, inside the project folder, run:

```powershell
npm install
```

This downloads everything the tests need, **including a private copy of the Chrome browser (about 300 MB)**. It can take several minutes. When it finishes without red error messages, you are ready.

> You do not need to install Chrome yourself — the test browser lives inside the project folder and does not touch anything else on your laptop.

---

## 4. Run the tests

**Important:** The dev chatbot is only reachable from the SBB network. Make sure you are **connected to the office network or VPN** before running tests.

### Run all tests

```powershell
npm run test:full
```

- Each test opens the chatbot in a fresh session, sends the question, and waits for the answer.
- A full run takes roughly **10–20 minutes** depending on how fast the AI answers. Just let it run.
- At the end you'll see a summary like `17 passed`.

### Watch the tests live (optional)

If you want to see the browser doing the work:

```powershell
npm run test:headed
```

### Re-run a single test

If one test failed (for example the AI took too long), you can re-run just that test by its ID:

```powershell
npm run test:case -- ab-standard-st-gallen-zuerich
```

Run `npm run test:case` without an ID to see the list of all available test IDs.

---

## 5. Look at the results

Every run creates a new folder inside `results\`, named after the date and time, for example:

```
results\2026-08-20T14-30-05-123\
```

Inside that folder you'll find:

| File | What it is | How to open |
|------|-----------|-------------|
| `report.html` | The full report with all screenshots | **Double-click it** — it opens in your browser |
| `report.md` | The same table for pasting into Confluence | Open with any text editor |
| `<test-id>\screenshot.png` | Screenshot of question + answer per test | Double-click |
| `<test-id>\response.txt` | The answer as plain text | Double-click |

To find the folder in Windows Explorer: open the project folder (e.g. `Documents\sbb-chat-testing`), then open `results`, then the newest folder.

### Putting results into Confluence

1. Open `report.md`, copy the table rows you need into the Confluence page.
2. For the screenshots, drag the `screenshot.png` files from the test folders directly into Confluence.

---

## 6. Change or add test questions

All test questions live in one file: `test-cases\test-cases.json`. Open it with Notepad (right-click → *Open with* → *Notepad*) or any editor.

Each test looks like this:

```json
{
  "id": "ab-standard-st-gallen-zuerich",
  "enabled": true,
  "category": "A–B-Verbindungen",
  "intention": "Standard A–B",
  "type": ["s", "u"],
  "prompt": "Ich will von St. Gallen nach Zürich fahren."
}
```

- **To change a question:** edit the `prompt` text.
- **To skip a test:** change `"enabled": true` to `"enabled": false`.
- **To add a test:** copy an existing block, paste it after a comma, and give it a new unique `id` (lowercase, words separated by `-`).

Save the file and run the tests again.

---

## 7. Get the latest version of the project

When someone updates the tests, fetch the newest version with:

```powershell
cd $HOME\Documents\sbb-chat-testing
git pull
npm install
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `git` or `node` is "not recognized" | Close and reopen PowerShell. If that doesn't help, restart the laptop. If it still fails, reinstall the program from step 1. |
| Tests fail immediately with a network/timeout error | You are probably not on the SBB network — connect to VPN and try again. |
| `npm install` fails with a proxy or certificate error | You may be behind the company proxy. Ask IT or the dev team for the proxy settings for npm. |
| A single test failed with "Timeout" | The AI was too slow this time. Re-run just that test: `npm run test:case -- <test-id>` |
| Error "Executable doesn't exist" when running tests | The browser download was interrupted. Run `npm install` again. |
| The terminal window shows red text mid-run but continues | Individual tests may fail while others pass — check the summary at the end and the report. |

Still stuck? Take a screenshot of the error message and send it to the dev team.
