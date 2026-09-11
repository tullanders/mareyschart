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
  it('renders one label per station at its computed x position', () => {
    const xForStation = new Map([
      ['a', 0],
      ['b', 200],
    ]);
    const { getByText } = render(
      <MareyChartProvider value={{ xForStation, yScale }}>
        <svg>
          <XAxis stations={stations} />
        </svg>
      </MareyChartProvider>
    );

    expect(getByText('Alpha')).toHaveAttribute('x', '0');
    expect(getByText('Beta')).toHaveAttribute('x', '200');
  });
});
