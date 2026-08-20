import type { Page, Request } from '@playwright/test';

export function parseChatSessionValue(rawValue: string): string {
  const withoutPrefix = rawValue.startsWith('chat_session=')
    ? rawValue.slice('chat_session='.length)
    : rawValue;

  return withoutPrefix.split(';')[0].trim();
}

export function extractChatSessionFromCookieHeader(cookieHeader: string): string | undefined {
  const match = cookieHeader.match(/(?:^|;\s*)chat_session=([^;]+)/);
  return match ? parseChatSessionValue(match[1]) : undefined;
}

export class ChatSessionCapture {
  private latestSessionId?: string;

  constructor(private readonly page: Page) {
    this.page.on('request', (request) => this.handleRequest(request));
  }

  private handleRequest(request: Request): void {
    const url = request.url();
    if (!url.includes('message')) {
      return;
    }

    const cookieHeader = request.headers()['cookie'] ?? '';
    const sessionId = extractChatSessionFromCookieHeader(cookieHeader);
    if (sessionId) {
      this.latestSessionId = sessionId;
    }
  }

  async getChatSessionId(): Promise<string | undefined> {
    if (this.latestSessionId) {
      return this.latestSessionId;
    }

    const cookies = await this.page.context().cookies();
    const sessionCookie = cookies.find((cookie) => cookie.name === 'chat_session');
    if (sessionCookie?.value) {
      return parseChatSessionValue(sessionCookie.value);
    }

    const documentCookies = await this.page.evaluate(() => document.cookie);
    return extractChatSessionFromCookieHeader(documentCookies);
  }
}
