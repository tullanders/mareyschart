import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useYScale } from './useYScale';
import { defaultConfig } from './config';

describe('useYScale — mechanical refresh while following now', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('advances the y-domain forward on the configured interval while following now', () => {
    const start = new Date('2026-01-01T12:00:00Z');
    vi.setSystemTime(start);

    const yConfig = { ...defaultConfig.yAxis, mechanicalRefreshIntervalMs: 1000 };

    const { result } = renderHook(() => useYScale(yConfig, 100));
    const initialDomain = result.current.yDomain;

    vi.setSystemTime(new Date(start.getTime() + 5 * 60_000));
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.yDomain[0].getTime()).toBeGreaterThan(initialDomain[0].getTime());
    expect(result.current.isFollowingNow).toBe(true);
  });

  it('stops advancing once the user has interacted (isFollowingNow is false)', () => {
    const start = new Date('2026-01-01T12:00:00Z');
    vi.setSystemTime(start);

    const yConfig = { ...defaultConfig.yAxis, mechanicalRefreshIntervalMs: 1000 };

    const { result } = renderHook(() => useYScale(yConfig, 100));

    act(() => {
      result.current.setYDomain(
        [new Date(start.getTime() - 5 * 60_000), new Date(start.getTime() + 20 * 60_000)],
        true
      );
    });
    const domainAfterUserPan = result.current.yDomain;

    vi.setSystemTime(new Date(start.getTime() + 5 * 60_000));
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.yDomain).toEqual(domainAfterUserPan);
    expect(result.current.isFollowingNow).toBe(false);
  });
});
