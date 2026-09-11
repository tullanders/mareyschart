import { render } from '@testing-library/react';
import { scaleTime } from 'd3-scale';
import { describe, expect, it } from 'vitest';
import { TrainLayer } from './TrainLayer';
import { MareyChartProvider } from './MareyChartContext';
import type { Train } from './types';

const yScale = scaleTime().domain([new Date(), new Date(Date.now() + 3600_000)]).range([0, 600]);
const xForStation = new Map([['a', 0]]);

describe('TrainLayer', () => {
  it('renders one TrainLine per train', () => {
    const trains: Train[] = [
      { id: 't1', points: [{ time: new Date(), place: 'a' }] },
      { id: 't2', points: [{ time: new Date(), place: 'a' }] },
    ];

    const { getAllByTestId } = render(
      <MareyChartProvider value={{ xForStation, yScale }}>
        <svg>
          <TrainLayer trains={trains} />
        </svg>
      </MareyChartProvider>
    );

    expect(getAllByTestId('train-line').length).toBe(2);
  });
});
