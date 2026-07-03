import { describe, expect, it } from 'vitest';

import { redactUrl } from '../src/common/http.js';

describe('redactUrl', () => {
  it('redacts API keys and tokens from logged URLs', () => {
    const url = new URL('https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=secret&steamid=123&access_token=token');

    expect(redactUrl(url)).toBe(
      'https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=%5Bredacted%5D&steamid=123&access_token=%5Bredacted%5D',
    );
  });
});
