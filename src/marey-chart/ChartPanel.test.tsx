// src/marey-chart/ChartPanel.test.tsx
import { render } from '@testing-library/react';
import { scaleTime } from 'd3-scale';
import { describe, expect, it, vi } from 'vitest';
import { ChartPanel, type ChartPanelProps } from './ChartPanel';
import { defaultConfig } from './config';
import type { Station, Train } from './types';

const stations: Station[] = [
  { id: 'a', name: 'A', distanceKm: 0 },
  { id: 'b', name: 'B', distanceKm: 10 },
];
const trains: Train[] = [];

function renderPanel(overrides: Partial<ChartPanelProps> = {}) {
  const yScale = scaleTime()
    .domain([new Date('2026-01-01T12:00:00Z'), new Date('2026-01-01T12:20:00Z')])
    .range([0, 200]);

  const props: ChartPanelProps = {
    stations,
    trains,
    width: 400,
    height: 200,
    config: defaultConfig,
    yScale,
    yDomain: yScale.domain() as [Date, Date],
    setYDomain: vi.fn(),
    isFollowingNow: true,
    resetToNow: vi.fn(),
    showLeftLabels: true,
    showRightLabels: true,
    showResetButton: true,
    ...overrides,
  };

  return render(
    <svg>
      <ChartPanel {...props} />
    </svg>
  );
}

describe('ChartPanel', () => {
  it('renders gridlines, x-axis, y-axis, trains and the now-line', () => {
    const { getByTestId } = renderPanel();
    expect(getByTestId('gridlines')).toBeTruthy();
    expect(getByTestId('x-axis')).toBeTruthy();
    expect(getByTestId('y-axis')).toBeTruthy();
    expect(getByTestId('train-layer')).toBeTruthy();
    expect(getByTestId('now-line')).toBeTruthy();
  });

  it('forwards label/reset-button visibility down to YAxis', () => {
    const { queryAllByTestId, queryByRole } = renderPanel({
      showLeftLabels: false,
      showRightLabels: false,
      showResetButton: false,
    });
    expect(queryAllByTestId('y-label-left').length).toBe(0);
    expect(queryAllByTestId('y-label-right').length).toBe(0);
    expect(queryByRole('button', { name: /återställ/i })).toBeNull();
  });

  it('places stations using its own width via useXForStation', () => {
    const { getAllByTestId } = renderPanel({ width: 400 });
    const gridlines = getAllByTestId('x-gridline');
    expect(gridlines[0].getAttribute('x1')).toBe('0');
    expect(gridlines[gridlines.length - 1].getAttribute('x1')).toBe('400');
  });
});
