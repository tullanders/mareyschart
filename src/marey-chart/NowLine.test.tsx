import { render } from '@testing-library/react';
import { scaleTime } from 'd3-scale';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NowLine } from './NowLine';
import { MareyChartProvider } from './MareyChartContext';

describe('NowLine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('moves its position on each tick without needing a re-render from the parent', () => {
    const start = new Date('2026-01-01T12:00:00Z');
    vi.setSystemTime(start);

    const yScale = scaleTime()
      .domain([start, new Date(start.getTime() + 60 * 60_000)])
      .range([0, 600]);

    const { container } = render(
      <MareyChartProvider
        value={{
          xForStation: new Map(),
          yScale,
          yDomain: yScale.domain() as [Date, Date],
          setYDomain: () => {},
          isFollowingNow: true,
          resetToNow: () => {},
        }}
      >
        <svg>
          <NowLine width={800} tickIntervalMs={1000} />
        </svg>
      </MareyChartProvider>
    );

    const line = container.querySelector('[data-testid="now-line"]');
    const initialY = line?.getAttribute('y1');

    vi.setSystemTime(new Date(start.getTime() + 5 * 60_000));
    vi.advanceTimersByTime(1000);

    expect(line?.getAttribute('y1')).not.toBe(initialY);
  });
});
