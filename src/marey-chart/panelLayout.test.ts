import { describe, expect, it } from 'vitest';
import { computePanelLayout } from './panelLayout';

describe('computePanelLayout', () => {
  it('gives a single panel the full width, with no gap applied', () => {
    const layouts = computePanelLayout([4], 1000, 28);
    expect(layouts).toEqual([{ width: 1000, x: 0 }]);
  });

  it('splits width between panels proportionally to station count, after subtracting the gap', () => {
    const layouts = computePanelLayout([3, 1], 828, 28);
    expect(layouts[0].width).toBeCloseTo(600);
    expect(layouts[0].x).toBeCloseTo(0);
    expect(layouts[1].width).toBeCloseTo(200);
    expect(layouts[1].x).toBeCloseTo(628);
  });

  it('splits width evenly when every panel has zero stations', () => {
    const layouts = computePanelLayout([0, 0], 800, 0);
    expect(layouts[0]).toEqual({ width: 400, x: 0 });
    expect(layouts[1]).toEqual({ width: 400, x: 400 });
  });

  it('returns an empty array for zero panels', () => {
    expect(computePanelLayout([], 1000, 28)).toEqual([]);
  });
});
