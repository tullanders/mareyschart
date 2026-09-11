import { describe, expect, it } from 'vitest';
import { clampYDomain } from './clampYDomain';
import { defaultConfig } from './config';

const now = new Date('2026-01-01T12:00:00Z');
const yConfig = defaultConfig.yAxis;

describe('clampYDomain', () => {
  it('leaves a domain within bounds untouched', () => {
    const domain: [Date, Date] = [
      new Date(now.getTime() - 10 * 60_000),
      new Date(now.getTime() + 50 * 60_000),
    ];
    const [start, end] = clampYDomain(domain, now, yConfig);
    expect(start).toEqual(domain[0]);
    expect(end).toEqual(domain[1]);
  });

  it('never allows the start before now - panBackLimitMs', () => {
    const domain: [Date, Date] = [
      new Date(now.getTime() - 60 * 60_000),
      new Date(now.getTime() + 30 * 60_000),
    ];
    const [start] = clampYDomain(domain, now, yConfig);
    expect(start.getTime()).toBe(now.getTime() - yConfig.panBackLimitMs);
  });

  it('never allows the end after now + panForwardLimitMs', () => {
    const domain: [Date, Date] = [
      new Date(now.getTime()),
      new Date(now.getTime() + 24 * 60 * 60_000),
    ];
    const [, end] = clampYDomain(domain, now, yConfig);
    expect(end.getTime()).toBe(now.getTime() + yConfig.panForwardLimitMs);
  });

  it('never allows a visible duration shorter than zoomMinDurationMs', () => {
    const domain: [Date, Date] = [now, new Date(now.getTime() + 5 * 60_000)];
    const [start, end] = clampYDomain(domain, now, yConfig);
    expect(end.getTime() - start.getTime()).toBe(yConfig.zoomMinDurationMs);
  });

  it('never allows a visible duration longer than zoomMaxDurationMs', () => {
    const domain: [Date, Date] = [now, new Date(now.getTime() + 10 * 60 * 60_000)];
    const [start, end] = clampYDomain(domain, now, yConfig);
    expect(end.getTime() - start.getTime()).toBe(yConfig.zoomMaxDurationMs);
  });
});
