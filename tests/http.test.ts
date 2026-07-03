import { afterEach, describe, expect, it, vi } from 'vitest';

import { HttpJsonClient, redactUrl } from '../src/common/http.js';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('redactUrl', () => {
  it('redacts API keys and tokens from logged URLs', () => {
    const url = new URL('https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=secret&steamid=123&access_token=token');

    expect(redactUrl(url)).toBe(
      'https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=%5Bredacted%5D&steamid=123&access_token=%5Bredacted%5D',
    );
  });

  it('rate limits consecutive requests when configured', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const client = new HttpJsonClient({
      rateLimitRps: 1,
      timeoutMs: 1000,
      userAgent: 'steam-mcp-server-test/0.0.0',
    });

    await client.getJson(new URL('https://example.test/first'));
    const secondRequest = client.getJson(new URL('https://example.test/second'));
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    await secondRequest;

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
