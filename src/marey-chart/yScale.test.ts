import { describe, expect, it } from 'vitest';
import { createDefaultYDomain } from './yScale';
import { defaultConfig } from './config';

describe('createDefaultYDomain', () => {
  it('spans 15 minutes before now to 60 minutes after now', () => {
    const now = new Date('2026-01-01T12:00:00Z');
    const [start, end] = createDefaultYDomain(now, defaultConfig.yAxis);

    expect(start.getTime()).toBe(now.getTime() - 15 * 60_000);
    expect(end.getTime()).toBe(now.getTime() + 60 * 60_000);
  });
});
