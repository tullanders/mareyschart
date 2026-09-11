import type { Station } from './types';

export function computeBlendedPositions(stations: Station[], blendWeight: number): number[] {
  const n = stations.length;
  if (n === 0) return [];
  if (n === 1) return [0];

  const totalDistance = stations[n - 1].distanceKm - stations[0].distanceKm;

  return stations.map((station, i) => {
    const ordinal = i / (n - 1);
    const real =
      totalDistance === 0 ? ordinal : (station.distanceKm - stations[0].distanceKm) / totalDistance;
    return ordinal * (1 - blendWeight) + real * blendWeight;
  });
}

export function applyPixelConstraints(
  blendedPositions: number[],
  width: number,
  minGap: number,
  maxShare: number
): number[] {
  const n = blendedPositions.length;
  if (n === 0) return [];
  if (n === 1) return [0];

  const minGapFraction = width === 0 ? 0 : minGap / width;

  const rawFractions: number[] = [];
  for (let i = 1; i < n; i++) {
    rawFractions.push(blendedPositions[i] - blendedPositions[i - 1]);
  }

  const clamped = rawFractions.map((f) => Math.min(Math.max(f, minGapFraction), maxShare));
  const total = clamped.reduce((sum, f) => sum + f, 0);
  const normalized = total === 0 ? clamped : clamped.map((f) => f / total);

  const positions = [0];
  for (const fraction of normalized) {
    positions.push(positions[positions.length - 1] + fraction);
  }

  return positions.map((p) => p * width);
}
