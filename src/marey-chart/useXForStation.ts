import { useMemo } from 'react';
import { applyPixelConstraints, computeBlendedPositions } from './xAxisPositioning';
import type { MareyChartConfig, Station } from './types';

export function useXForStation(
  stations: Station[],
  config: MareyChartConfig['xAxis'],
  width: number
): Map<string, number> {
  return useMemo(() => {
    const blended = computeBlendedPositions(stations, config.blendWeight);
    const pixels = applyPixelConstraints(
      blended,
      width,
      config.minStationPixelGap,
      config.maxSegmentShare
    );
    return new Map(stations.map((station, i) => [station.id, pixels[i]]));
  }, [stations, config.blendWeight, config.minStationPixelGap, config.maxSegmentShare, width]);
}
