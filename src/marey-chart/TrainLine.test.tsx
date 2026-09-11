import { render } from '@testing-library/react';
import { scaleTime } from 'd3-scale';
import { describe, expect, it } from 'vitest';
import { TrainLine } from './TrainLine';
import { MareyChartProvider } from './MareyChartContext';
import type { Train } from './types';

const yScale = scaleTime()
  .domain([new Date('2026-01-01T12:00:00Z'), new Date('2026-01-01T13:00:00Z')])
  .range([0, 600]);

const xForStation = new Map([
  ['a', 0],
  ['b', 100],
  ['c', 200],
]);

describe('TrainLine', () => {
  it('draws a path point for every stop at a known station', () => {
    const train: Train = {
      id: 't1',
      points: [
        { time: new Date('2026-01-01T12:00:00Z'), place: 'a' },
        { time: new Date('2026-01-01T12:30:00Z'), place: 'b' },
      ],
    };

    const { container } = render(
      <MareyChartProvider value={{ xForStation, yScale }}>
        <svg>
          <TrainLine train={train} />
        </svg>
      </MareyChartProvider>
    );

    const path = container.querySelector('[data-testid="train-line"]');
    expect(path).not.toBeNull();
    expect(path?.getAttribute('d')).toContain('M0,0');
  });

  it('skips stops at unknown places, interpolating between known points', () => {
    const train: Train = {
      id: 't2',
      points: [
        { time: new Date('2026-01-01T12:00:00Z'), place: 'a' },
        { time: new Date('2026-01-01T12:15:00Z'), place: 'unknown-passthrough' },
        { time: new Date('2026-01-01T12:30:00Z'), place: 'b' },
      ],
    };

    const { container } = render(
      <MareyChartProvider value={{ xForStation, yScale }}>
        <svg>
          <TrainLine train={train} />
        </svg>
      </MareyChartProvider>
    );

    const path = container.querySelector('[data-testid="train-line"]');
    // Only two known points -> a single "L" segment, not three.
    expect(path?.getAttribute('d')?.match(/L/g)?.length).toBe(1);
  });
});
