import { fireEvent, render } from '@testing-library/react';
import { scaleTime } from 'd3-scale';
import { describe, expect, it, vi } from 'vitest';
import { YAxis } from './YAxis';
import { MareyChartProvider } from './MareyChartContext';
import { useYScale } from './useYScale';
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

  it('pans (keeps duration constant) on plain wheel, and zooms (changes duration) on ctrl+wheel', () => {
    const initialDomain: [Date, Date] = [
      new Date('2026-01-01T12:00:00Z'),
      new Date('2026-01-01T12:20:00Z'),
    ];
    const yScale = scaleTime().domain(initialDomain).range([0, 200]);
    const setYDomain = vi.fn();

    const { getByTestId } = render(
      <MareyChartProvider
        value={{
          xForStation: new Map(),
          yScale,
          yDomain: initialDomain,
          setYDomain,
          isFollowingNow: true,
        }}
      >
        <svg>
          <YAxis width={400} height={200} />
        </svg>
      </MareyChartProvider>
    );

    const surface = getByTestId('y-axis-zoom-surface');
    const initialDurationMs = initialDomain[1].getTime() - initialDomain[0].getTime();

    fireEvent.wheel(surface, { deltaY: 20 });
    const [panned] = setYDomain.mock.calls[0] as [[Date, Date], boolean];
    const pannedDurationMs = panned[1].getTime() - panned[0].getTime();
    expect(pannedDurationMs).toBe(initialDurationMs);
    expect(panned[0].getTime()).toBeGreaterThan(initialDomain[0].getTime());

    setYDomain.mockClear();
    fireEvent.wheel(surface, { deltaY: -10, ctrlKey: true });
    const [zoomed] = setYDomain.mock.calls[0] as [[Date, Date], boolean];
    const zoomedDurationMs = zoomed[1].getTime() - zoomed[0].getTime();
    expect(zoomedDurationMs).not.toBe(initialDurationMs);
  });

  it('hides left/right labels and the reset button when the corresponding show* props are false', () => {
    const yScale = scaleTime()
      .domain([new Date('2026-01-01T12:00:00Z'), new Date('2026-01-01T12:20:00Z')])
      .range([0, 200]);
    const resetToNow = vi.fn();

    const { queryAllByTestId, queryByRole } = render(
      <MareyChartProvider
        value={{
          xForStation: new Map(),
          yScale,
          yDomain: yScale.domain() as [Date, Date],
          setYDomain: vi.fn(),
          isFollowingNow: true,
          resetToNow,
        }}
      >
        <svg>
          <YAxis
            width={400}
            height={200}
            showLeftLabels={false}
            showRightLabels={false}
            showResetButton={false}
          />
        </svg>
      </MareyChartProvider>
    );

    expect(queryAllByTestId('y-label-left').length).toBe(0);
    expect(queryAllByTestId('y-label-right').length).toBe(0);
    expect(queryByRole('button', { name: /återställ/i })).toBeNull();
  });

  it('does not require an excessive number of reverse wheel ticks to leave a zoom bound', () => {
    function Harness({ onDomain }: { onDomain: (d: [Date, Date]) => void }) {
      const scales = useYScale(defaultConfig.yAxis, 200);
      onDomain(scales.yDomain);
      return (
        <svg>
          <MareyChartProvider value={{ xForStation: new Map(), ...scales }}>
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

      // Zoom in far past the min-duration bound. Zoom is now gated on
      // ctrl+wheel (plain wheel pans instead).
      for (let i = 0; i < 40; i++) {
        fireEvent.wheel(surface, { deltaY: -100, ctrlKey: true });
      }
      const durationAtBound = lastDomain[1].getTime() - lastDomain[0].getTime();
      expect(durationAtBound).toBe(defaultConfig.yAxis.zoomMinDurationMs);

      // Let d3-zoom's wheel-idle timeout (150ms) end the gesture, exactly
      // like a real user pausing between scroll motions.
      vi.advanceTimersByTime(200);

      // A single opposite tick in a brand new gesture must move the domain
      // right away — it must not still be swallowed by leftover accumulation
      // from the previous gesture.
      fireEvent.wheel(surface, { deltaY: 100, ctrlKey: true });
      const durationAfterOneReverseTick = lastDomain[1].getTime() - lastDomain[0].getTime();
      expect(durationAfterOneReverseTick).toBeGreaterThan(durationAtBound);
    } finally {
      vi.useRealTimers();
    }
  });
});
