import { render } from '@testing-library/react';
import { scaleTime } from 'd3-scale';
import { describe, expect, it } from 'vitest';
import { GridLines } from './GridLines';
import { MareyChartProvider } from './MareyChartContext';

describe('GridLines', () => {
  it('renders one line per scale tick', () => {
    const yScale = scaleTime()
      .domain([new Date('2026-01-01T12:00:00Z'), new Date('2026-01-01T13:15:00Z')])
      .range([0, 600]);

    const { container } = render(
      <MareyChartProvider value={{ xForStation: new Map(), yScale }}>
        <svg>
          <GridLines width={600} />
        </svg>
      </MareyChartProvider>
    );

    const lines = container.querySelectorAll('[data-testid="gridline"]');
    expect(lines.length).toBe(yScale.ticks().length);
  });
});
