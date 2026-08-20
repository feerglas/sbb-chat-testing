import { expect, type Locator, type Page } from '@playwright/test';

export class SbbChatPage {
  readonly messageInput: Locator;
  readonly botResponses: Locator;
  readonly chatArea: Locator;
  readonly startChatButton: Locator;
  readonly sendButton: Locator;

  constructor(private readonly page: Page) {
    this.messageInput = page.getByPlaceholder('Geben Sie eine Nachricht ein...');
    this.botResponses = page.locator('app-bot-content-block');
    this.chatArea = page.locator('.main-content');
    this.startChatButton = page.getByRole('button', { name: 'Neuen Chat starten' });
    this.sendButton = page.locator('sbb-button[iconname="arrow-right-small"]');
  }

  async goto(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: 'load' });
    await expect(this.page.locator('app-sbb-chat-harness')).toBeVisible({ timeout: 30_000 });
  }

  async ensureActiveSession(): Promise<void> {
    if (await this.startChatButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await this.startChatButton.click();
    }

    await expect(this.messageInput).toBeVisible({ timeout: 15_000 });
    await expect(this.messageInput).toBeEnabled();
  }

  async startFreshSession(): Promise<void> {
    await this.page.reload({ waitUntil: 'load' });
    await this.ensureActiveSession();
  }

  async sendMessage(text: string): Promise<number> {
    const previousCount = await this.botResponses.count();
    await this.messageInput.fill(text);
    await expect(this.sendButton).toBeEnabled({ timeout: 5_000 });
    await this.sendButton.click();
    return previousCount;
  }

  async waitForBotResponse(previousCount: number, timeoutMs: number): Promise<string> {
    await expect
      .poll(async () => this.botResponses.count(), {
        timeout: timeoutMs,
        message: 'Waiting for bot response block to appear',
      })
      .toBeGreaterThan(previousCount);

    const latestResponse = this.botResponses.last();
    await expect(latestResponse).toBeVisible({ timeout: 10_000 });

    await this.waitForResponseStabilization(latestResponse, timeoutMs);

    return (await latestResponse.innerText()).trim();
  }

  private async waitForResponseStabilization(
    responseLocator: Locator,
    timeoutMs: number,
  ): Promise<void> {
    let previousText = '';
    let stableChecks = 0;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const currentText = (await responseLocator.innerText()).trim();

      if (currentText.length > 0 && currentText === previousText) {
        stableChecks += 1;
        if (stableChecks >= 2) {
          await this.page.waitForTimeout(1_500);
          return;
        }
      } else {
        stableChecks = 0;
        previousText = currentText;
      }

      await this.page.waitForTimeout(1_000);
    }
  }

  async screenshotFullPage(path: string): Promise<void> {
    await expect(this.chatArea).toBeVisible({ timeout: 10_000 });

    const totalHeight = await this.chatArea.evaluate((main) => {
      main.dataset.sbbOriginalHeight = main.style.height;
      main.dataset.sbbOriginalMaxHeight = main.style.maxHeight;
      main.dataset.sbbOriginalOverflow = main.style.overflow;
      main.style.height = `${main.scrollHeight}px`;
      main.style.maxHeight = 'none';
      main.style.overflow = 'visible';

      const layout = main.closest('.layout') as HTMLElement | null;
      const layoutTop = layout?.getBoundingClientRect().top ?? 0;
      const layoutScrollHeight = layout?.scrollHeight ?? main.scrollHeight;
      return Math.ceil(layoutTop + layoutScrollHeight);
    });

    await this.page.evaluate(({ height }) => {
      const docEl = document.documentElement;
      const body = document.body;
      docEl.dataset.sbbOriginalHeight = docEl.style.height;
      body.dataset.sbbOriginalHeight = body.style.height;
      body.dataset.sbbOriginalOverflow = body.style.overflow;
      docEl.style.height = `${height}px`;
      body.style.height = `${height}px`;
      body.style.overflow = 'visible';

      const harness = document.querySelector('app-sbb-chat-harness') as HTMLElement | null;
      if (harness) {
        harness.dataset.sbbOriginalHeight = harness.style.height;
        harness.style.height = 'auto';
      }
    }, { height: totalHeight });

    await this.page.screenshot({ path, fullPage: true });

    await this.page.evaluate(() => {
      const docEl = document.documentElement;
      const body = document.body;
      docEl.style.height = docEl.dataset.sbbOriginalHeight ?? '';
      body.style.height = body.dataset.sbbOriginalHeight ?? '';
      body.style.overflow = body.dataset.sbbOriginalOverflow ?? '';

      const harness = document.querySelector('app-sbb-chat-harness') as HTMLElement | null;
      if (harness) {
        harness.style.height = harness.dataset.sbbOriginalHeight ?? '';
      }
    });

    await this.chatArea.evaluate((main) => {
      main.style.height = main.dataset.sbbOriginalHeight ?? '';
      main.style.maxHeight = main.dataset.sbbOriginalMaxHeight ?? '';
      main.style.overflow = main.dataset.sbbOriginalOverflow ?? '';
    });
  }
}
