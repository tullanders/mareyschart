import { act, fireEvent, render, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MareyChart } from './MareyChart';
import type { Station } from './types';

let resizeCallback: ResizeObserverCallback = () => {};

class MockResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    resizeCallback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

function resize(width: number, height: number) {
  act(() => {
    resizeCallback(
      [{ contentRect: { width, height } } as ResizeObserverEntry],
      {} as ResizeObserver
    );
  });
}

const stationsA: Station[] = [
  { id: 'a', name: 'A', distanceKm: 0 },
  { id: 'b', name: 'B', distanceKm: 10 },
  { id: 'c', name: 'C', distanceKm: 20 },
];
const stationsB: Station[] = [{ id: 'd', name: 'D', distanceKm: 0 }];
const stationsC: Station[] = [{ id: 'e', name: 'E', distanceKm: 0 }];

describe('MareyChart', () => {
  it('renders an svg matching the wrapper size', () => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    const { getByTestId } = render(
      <MareyChart panels={[{ id: 'main', stations: [], trains: [] }]} />
    );

    resize(500, 400);

    const svg = getByTestId('marey-chart-svg');
    expect(svg.getAttribute('width')).toBe('500');
    expect(svg.getAttribute('height')).toBe('400');
  });

  it('shows labels on both sides and the reset button when there is a single panel', () => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    const { getByTestId } = render(
      <MareyChart panels={[{ id: 'main', stations: stationsA, trains: [] }]} />
    );
    resize(500, 400);

    const panel = within(getByTestId('chart-panel-main'));
    expect(panel.getAllByTestId('y-label-left').length).toBeGreaterThan(0);
    expect(panel.getAllByTestId('y-label-right').length).toBeGreaterThan(0);
    expect(panel.getByRole('button', { name: /återställ/i })).toBeTruthy();
  });

  it('shows left labels + reset button only on the first panel, right labels only on the last', () => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    const { getByTestId } = render(
      <MareyChart
        panels={[
          { id: 'main', stations: stationsA, trains: [] },
          { id: 'branch', stations: stationsB, trains: [] },
        ]}
      />
    );
    resize(900, 400);

    const main = within(getByTestId('chart-panel-main'));
    const branch = within(getByTestId('chart-panel-branch'));

    expect(main.getAllByTestId('y-label-left').length).toBeGreaterThan(0);
    expect(main.queryAllByTestId('y-label-right').length).toBe(0);
    expect(main.getByRole('button', { name: /återställ/i })).toBeTruthy();

    expect(branch.queryAllByTestId('y-label-left').length).toBe(0);
    expect(branch.getAllByTestId('y-label-right').length).toBeGreaterThan(0);
    expect(branch.queryByRole('button', { name: /återställ/i })).toBeNull();
  });

  it('gives panels width proportional to their station count', () => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    const { getByTestId } = render(
      <MareyChart
        panels={[
          { id: 'main', stations: stationsA, trains: [] }, // 3 stations
          { id: 'branch', stations: stationsB, trains: [] }, // 1 station
        ]}
      />
    );
    // plotWidth = 900 - 64*2 = 772; available = 772 - 28 = 744
    // weights 3/4, 1/4 -> main width 558, branch x = 558 + 28 = 586
    resize(900, 400);

    const branchGroup = getByTestId('chart-panel-branch');
    const transform = branchGroup.getAttribute('transform') ?? '';
    const match = transform.match(/translate\(([-\d.]+),/);
    const branchX = match ? Number(match[1]) : NaN;

    expect(branchX).toBeCloseTo(586, 5);
  });

  it('syncs pan/zoom across panels: a wheel gesture over the branch panel moves the main panel domain', () => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    const { getByTestId } = render(
      <MareyChart
        panels={[
          { id: 'main', stations: stationsA, trains: [] },
          { id: 'branch', stations: stationsB, trains: [] },
        ]}
      />
    );
    resize(900, 400);

    const main = within(getByTestId('chart-panel-main'));
    const branch = within(getByTestId('chart-panel-branch'));

    const baselineLabels = main.getAllByTestId('y-label-left').map((el) => el.textContent);
    expect(baselineLabels.length).toBeGreaterThan(0);

    const branchSurface = branch.getByTestId('y-axis-zoom-surface');
    act(() => {
      fireEvent.wheel(branchSurface, { deltaY: 500 });
    });

    const updatedLabels = main.getAllByTestId('y-label-left').map((el) => el.textContent);
    expect(updatedLabels).not.toEqual(baselineLabels);
  });

  it('suppresses all labels and the reset button on middle panels when there are 3+ panels', () => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    const { getByTestId } = render(
      <MareyChart
        panels={[
          { id: 'main', stations: stationsA, trains: [] },
          { id: 'branch', stations: stationsB, trains: [] },
          { id: 'branch2', stations: stationsC, trains: [] },
        ]}
      />
    );
    resize(1200, 400);

    const main = within(getByTestId('chart-panel-main'));
    const middle = within(getByTestId('chart-panel-branch'));
    const last = within(getByTestId('chart-panel-branch2'));

    expect(main.getAllByTestId('y-label-left').length).toBeGreaterThan(0);
    expect(main.queryAllByTestId('y-label-right').length).toBe(0);
    expect(main.getByRole('button', { name: /återställ/i })).toBeTruthy();

    expect(middle.queryAllByTestId('y-label-left').length).toBe(0);
    expect(middle.queryAllByTestId('y-label-right').length).toBe(0);
    expect(middle.queryByRole('button', { name: /återställ/i })).toBeNull();

    expect(last.queryAllByTestId('y-label-left').length).toBe(0);
    expect(last.getAllByTestId('y-label-right').length).toBeGreaterThan(0);
    expect(last.queryByRole('button', { name: /återställ/i })).toBeNull();
  });
});
