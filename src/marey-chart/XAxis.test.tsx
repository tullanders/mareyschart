import { render } from '@testing-library/react';
import { scaleTime } from 'd3-scale';
import { describe, expect, it } from 'vitest';
import { XAxis } from './XAxis';
import { MareyChartProvider } from './MareyChartContext';
import type { Station } from './types';

const stations: Station[] = [
  { id: 'a', name: 'Alpha', distanceKm: 0 },
  { id: 'b', name: 'Beta', distanceKm: 10 },
];

const yScale = scaleTime().domain([new Date(), new Date(Date.now() + 3600_000)]).range([0, 600]);

describe('XAxis', () => {
  it('renders a top and bottom label per station at its computed x position', () => {
    const xForStation = new Map([
      ['a', 0],
      ['b', 200],
    ]);
    const { getAllByText } = render(
      <MareyChartProvider value={{ xForStation, yScale }}>
        <svg>
          <XAxis stations={stations} height={300} />
        </svg>
      </MareyChartProvider>
    );

    const alphaLabels = getAllByText('Alpha');
    expect(alphaLabels).toHaveLength(2);
    for (const label of alphaLabels) {
      expect(label).toHaveAttribute('x', '0');
    }

    const betaLabels = getAllByText('Beta');
    expect(betaLabels).toHaveLength(2);
    for (const label of betaLabels) {
      expect(label).toHaveAttribute('x', '200');
    }
  });

  it('renders one vertical gridline per station spanning the full plot height', () => {
    const xForStation = new Map([
      ['a', 0],
      ['b', 200],
    ]);
    const { getAllByTestId } = render(
      <MareyChartProvider value={{ xForStation, yScale }}>
        <svg>
          <XAxis stations={stations} height={300} />
        </svg>
      </MareyChartProvider>
    );

    const lines = getAllByTestId('x-gridline');
    expect(lines).toHaveLength(2);
    for (const line of lines) {
      expect(line).toHaveAttribute('y1', '0');
      expect(line).toHaveAttribute('y2', '300');
    }
  });
});
