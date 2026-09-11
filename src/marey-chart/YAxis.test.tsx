import { render } from '@testing-library/react';
import { scaleTime } from 'd3-scale';
import { describe, expect, it } from 'vitest';
import { YAxis } from './YAxis';
import { MareyChartProvider } from './MareyChartContext';

describe('YAxis', () => {
  it('renders a time label on both sides for each tick', () => {
    const yScale = scaleTime()
      .domain([new Date('2026-01-01T12:00:00Z'), new Date('2026-01-01T12:20:00Z')])
      .range([0, 200]);

    const { getAllByTestId } = render(
      <MareyChartProvider value={{ xForStation: new Map(), yScale }}>
        <svg>
          <YAxis width={400} />
        </svg>
      </MareyChartProvider>
    );

    const leftLabels = getAllByTestId('y-label-left');
    const rightLabels = getAllByTestId('y-label-right');
    expect(leftLabels.length).toBe(yScale.ticks().length);
    expect(rightLabels.length).toBe(yScale.ticks().length);
  });
});
