import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useMareyScales } from './useMareyScales';
import { defaultConfig } from './config';
import type { Station } from './types';

const stations: Station[] = [
  { id: 'a', name: 'A', distanceKm: 0 },
  { id: 'b', name: 'B', distanceKm: 50 },
  { id: 'c', name: 'C', distanceKm: 100 },
];

describe('useMareyScales', () => {
  it('memoizes x positions on stations and config, not on unrelated re-renders', () => {
    const dims = { width: 1000, height: 600 };
    const { result, rerender } = renderHook(
      ({ s, c }) => useMareyScales(s, c, dims),
      { initialProps: { s: stations, c: defaultConfig } }
    );

    const firstMap = result.current.xForStation;
    expect(firstMap.get('a')).toBeCloseTo(0);
    expect(firstMap.get('c')).toBeCloseTo(1000);

    rerender({ s: stations, c: defaultConfig });
    expect(result.current.xForStation).toBe(firstMap); // same reference: memoized
  });
});
