import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useContainerSize } from './useContainerSize';

let resizeCallback: ResizeObserverCallback = () => {};

class MockResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    resizeCallback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

function TestComponent() {
  const [ref, size] = useContainerSize<HTMLDivElement>();
  return (
    <div ref={ref} data-testid="wrapper">
      {size.width}x{size.height}
    </div>
  );
}

describe('useContainerSize', () => {
  it('updates size when the observed element resizes', () => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    const { getByTestId } = render(<TestComponent />);

    expect(getByTestId('wrapper').textContent).toBe('0x0');

    act(() => {
      resizeCallback(
        [{ contentRect: { width: 400, height: 300 } } as ResizeObserverEntry],
        {} as ResizeObserver
      );
    });

    expect(getByTestId('wrapper').textContent).toBe('400x300');
  });
});
