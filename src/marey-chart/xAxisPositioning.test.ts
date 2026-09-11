import { describe, expect, it } from 'vitest';
import { computeBlendedPositions, applyPixelConstraints } from './xAxisPositioning';
import type { Station } from './types';

const stations: Station[] = [
  { id: 'a', name: 'A', distanceKm: 0 },
  { id: 'b', name: 'B', distanceKm: 10 },
  { id: 'c', name: 'C', distanceKm: 100 },
];

describe('computeBlendedPositions', () => {
  it('is purely equidistant at weight 0', () => {
    const positions = computeBlendedPositions(stations, 0);
    expect(positions).toEqual([0, 0.5, 1]);
  });

  it('is purely proportional to distance at weight 1', () => {
    const positions = computeBlendedPositions(stations, 1);
    expect(positions[0]).toBeCloseTo(0);
    expect(positions[1]).toBeCloseTo(0.1);
    expect(positions[2]).toBeCloseTo(1);
  });

  it('blends linearly between the two at intermediate weights', () => {
    const positions = computeBlendedPositions(stations, 0.5);
    expect(positions[1]).toBeCloseTo((0.5 + 0.1) / 2);
  });
});

describe('applyPixelConstraints', () => {
  it('spaces stations proportionally when no constraint binds', () => {
    const positions = applyPixelConstraints([0, 0.5, 1], 1000, 10, 0.9);
    expect(positions[0]).toBeCloseTo(0);
    expect(positions[1]).toBeCloseTo(500);
    expect(positions[2]).toBeCloseTo(1000);
  });

  it('pushes apart stations closer than the minimum pixel gap', () => {
    // Raw fractions imply a 5px gap between index 0 and 1 on a 1000px width.
    const positions = applyPixelConstraints([0, 0.005, 1], 1000, 50, 0.9);
    expect(positions[1] - positions[0]).toBeGreaterThanOrEqual(49); // allow rounding
  });

  it('shrinks a segment that would exceed the max share of total width', () => {
    const unconstrained = applyPixelConstraints([0, 0.9, 1], 1000, 1, 1);
    const constrained = applyPixelConstraints([0, 0.9, 1], 1000, 1, 0.3);
    const unconstrainedShare = (unconstrained[1] - unconstrained[0]) / 1000;
    const constrainedShare = (constrained[1] - constrained[0]) / 1000;
    expect(constrainedShare).toBeLessThan(unconstrainedShare);
  });
});
