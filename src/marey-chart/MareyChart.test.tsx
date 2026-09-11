import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MareyChart } from './MareyChart';

let resizeCallback: ResizeObserverCallback = () => {};

class MockResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    resizeCallback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('MareyChart', () => {
  it('renders an svg matching the wrapper size', () => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    const { getByTestId } = render(<MareyChart stations={[]} trains={[]} />);

    act(() => {
      resizeCallback(
        [{ contentRect: { width: 500, height: 400 } } as ResizeObserverEntry],
        {} as ResizeObserver
      );
    });

    const svg = getByTestId('marey-chart-svg');
    expect(svg.getAttribute('width')).toBe('500');
    expect(svg.getAttribute('height')).toBe('400');
  });
});
