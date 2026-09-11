import { useMemo } from 'react';
import { applyPixelConstraints, computeBlendedPositions } from './xAxisPositioning';
import type { MareyChartConfig, Station } from './types';

export type ChartDims = { width: number; height: number };

export function useMareyScales(stations: Station[], config: MareyChartConfig, dims: ChartDims) {
  const xForStation = useMemo(() => {
    const blended = computeBlendedPositions(stations, config.xAxis.blendWeight);
    const pixels = applyPixelConstraints(
      blended,
      dims.width,
      config.xAxis.minStationPixelGap,
      config.xAxis.maxSegmentShare
    );
    return new Map(stations.map((station, i) => [station.id, pixels[i]]));
  }, [stations, config.xAxis.blendWeight, config.xAxis.minStationPixelGap, config.xAxis.maxSegmentShare, dims.width]);

  return { xForStation };
}
