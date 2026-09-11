import { fireEvent, render } from '@testing-library/react';
import { scaleTime } from 'd3-scale';
import { describe, expect, it, vi } from 'vitest';
import { YAxis } from './YAxis';
import { MareyChartProvider } from './MareyChartContext';
import { useMareyScales } from './useMareyScales';
import { defaultConfig } from './config';

describe('YAxis', () => {
  it('renders a time label on both sides for each tick', () => {
    const yScale = scaleTime()
      .domain([new Date('2026-01-01T12:00:00Z'), new Date('2026-01-01T12:20:00Z')])
      .range([0, 200]);

    const { getAllByTestId } = render(
      <MareyChartProvider value={{ xForStation: new Map(), yScale }}>
        <svg>
          <YAxis width={400} height={200} />
        </svg>
      </MareyChartProvider>
    );

    const leftLabels = getAllByTestId('y-label-left');
    const rightLabels = getAllByTestId('y-label-right');
    expect(leftLabels.length).toBe(yScale.ticks().length);
    expect(rightLabels.length).toBe(yScale.ticks().length);
  });

  it('calls setYDomain with causedByUserGesture=true on user wheel input, and renders a reset control', () => {
    const yScale = scaleTime()
      .domain([new Date('2026-01-01T12:00:00Z'), new Date('2026-01-01T12:20:00Z')])
      .range([0, 200]);
    const setYDomain = vi.fn();
    const resetToNow = vi.fn();

    const { getByTestId, getByRole } = render(
      <MareyChartProvider
        value={{
          xForStation: new Map(),
          yScale,
          yDomain: yScale.domain() as [Date, Date],
          setYDomain,
          isFollowingNow: true,
          resetToNow,
        }}
      >
        <svg>
          <YAxis width={400} height={200} />
        </svg>
      </MareyChartProvider>
    );

    fireEvent.wheel(getByTestId('y-axis-zoom-surface'), { deltaY: -10 });
    expect(setYDomain).toHaveBeenCalled();
    expect(setYDomain.mock.calls[0][1]).toBe(true);

    fireEvent.click(getByRole('button', { name: /återställ/i }));
    expect(resetToNow).toHaveBeenCalled();
  });

  it('does not require an excessive number of reverse wheel ticks to leave a zoom bound', () => {
    function Harness({ onDomain }: { onDomain: (d: [Date, Date]) => void }) {
      const scales = useMareyScales([], defaultConfig, { width: 400, height: 200 });
      onDomain(scales.yDomain);
      return (
        <svg>
          <MareyChartProvider value={scales}>
            <YAxis width={400} height={200} />
          </MareyChartProvider>
        </svg>
      );
    }

    vi.useFakeTimers();
    try {
      let lastDomain: [Date, Date] = [new Date(0), new Date(0)];
      const { getByTestId } = render(<Harness onDomain={(d) => (lastDomain = d)} />);
      const surface = getByTestId('y-axis-zoom-surface');

      // Zoom in far past the min-duration bound.
      for (let i = 0; i < 40; i++) {
        fireEvent.wheel(surface, { deltaY: -100 });
      }
      const durationAtBound = lastDomain[1].getTime() - lastDomain[0].getTime();
      expect(durationAtBound).toBe(defaultConfig.yAxis.zoomMinDurationMs);

      // Let d3-zoom's wheel-idle timeout (150ms) end the gesture, exactly
      // like a real user pausing between scroll motions.
      vi.advanceTimersByTime(200);

      // A single opposite tick in a brand new gesture must move the domain
      // right away — it must not still be swallowed by leftover accumulation
      // from the previous gesture.
      fireEvent.wheel(surface, { deltaY: 100 });
      const durationAfterOneReverseTick = lastDomain[1].getTime() - lastDomain[0].getTime();
      expect(durationAfterOneReverseTick).toBeGreaterThan(durationAtBound);
    } finally {
      vi.useRealTimers();
    }
  });
});
