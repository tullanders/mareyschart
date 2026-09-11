import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useXForStation } from './useXForStation';
import { defaultConfig } from './config';
import type { Station } from './types';

const stations: Station[] = [
  { id: 'a', name: 'A', distanceKm: 0 },
  { id: 'b', name: 'B', distanceKm: 50 },
  { id: 'c', name: 'C', distanceKm: 100 },
];

describe('useXForStation', () => {
  it('memoizes x positions on stations, config and width, not on unrelated re-renders', () => {
    const { result, rerender } = renderHook(
      ({ s, c, w }) => useXForStation(s, c, w),
      { initialProps: { s: stations, c: defaultConfig.xAxis, w: 1000 } }
    );

    const firstMap = result.current;
    expect(firstMap.get('a')).toBeCloseTo(0);
    expect(firstMap.get('c')).toBeCloseTo(1000);

    rerender({ s: stations, c: defaultConfig.xAxis, w: 1000 });
    expect(result.current).toBe(firstMap); // same reference: memoized
  });
});
