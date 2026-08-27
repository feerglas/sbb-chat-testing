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
    await this.dismissCookieConsent();
    await expect(this.page.locator('app-sbb-chat-harness')).toBeVisible({ timeout: 30_000 });
  }

  private async dismissCookieConsent(): Promise<void> {
    const acceptButton = this.page.locator('#onetrust-accept-btn-handler');

    await acceptButton
      .waitFor({ state: 'visible', timeout: 10_000 })
      .then(() => acceptButton.click())
      .catch(() => undefined);

    await expect(this.page.locator('#onetrust-consent-sdk')).toBeHidden({
      timeout: 5_000,
    });
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

  private async waitForWidgetsLoaded(botBlock: Locator): Promise<void> {
    await expect
      .poll(async () => botBlock.innerText(), {
        timeout: 15_000,
        message: 'Waiting for bot response text to render',
      })
      .not.toBe('');

    let previousHeight = 0;
    let stableChecks = 0;

    while (stableChecks < 3) {
      const box = await botBlock.boundingBox();
      const height = box?.height ?? 0;

      if (height > 0 && height === previousHeight) {
        stableChecks += 1;
      } else {
        stableChecks = 0;
        previousHeight = height;
      }

      await this.page.waitForTimeout(500);
    }
  }

  async screenshotFullPage(path: string): Promise<void> {
    const lastBot = this.botResponses.last();

    await expect(lastBot).toBeVisible({ timeout: 10_000 });
    await this.waitForWidgetsLoaded(lastBot);

    const originalViewport = this.page.viewportSize() ?? { width: 390, height: 844 };

    try {
      // The chat pane is a fixed-height scroll container: content below the fold
      // is not painted, so clipping beyond it captures blank space. Grow the
      // viewport so the entire conversation renders at once, then clip the
      // question-to-answer region exactly.
      const requiredHeight = await this.chatArea.evaluate((main) => main.scrollHeight);
      await this.page.setViewportSize({
        width: originalViewport.width,
        height: requiredHeight + 300,
      });
      await this.page.waitForTimeout(1_000);

      const clip = await this.chatArea.evaluate((main) => {
        const users = main.querySelectorAll('app-user-content-block');
        const bots = main.querySelectorAll('app-bot-content-block');
        const lastUserEl = users[users.length - 1] as HTMLElement | undefined;
        const lastBotEl = bots[bots.length - 1] as HTMLElement | undefined;

        if (!lastUserEl || !lastBotEl) {
          return null;
        }

        const userRect = lastUserEl.getBoundingClientRect();
        const botRect = lastBotEl.getBoundingClientRect();
        const clipY = Math.max(0, userRect.top - 12);

        return {
          x: 0,
          y: clipY,
          width: Math.ceil(userRect.width > 0 ? (main as HTMLElement).offsetWidth : 390),
          height: Math.ceil(botRect.bottom + 12 - clipY),
        };
      });

      if (!clip || clip.height <= 0) {
        throw new Error('Could not determine screenshot region for question and answer');
      }

      await this.page.screenshot({
        path,
        clip: { ...clip, width: originalViewport.width },
      });
    } finally {
      await this.page.setViewportSize(originalViewport);
      await this.page.waitForTimeout(300);
    }
  }
}
