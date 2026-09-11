import { useCallback, useMemo, useState } from 'react';
import { applyPixelConstraints, computeBlendedPositions } from './xAxisPositioning';
import { createDefaultYDomain, createYScale } from './yScale';
import { clampYDomain } from './clampYDomain';
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

  const [yDomain, setYDomainState] = useState<[Date, Date]>(() =>
    createDefaultYDomain(new Date(), config.yAxis)
  );
  const [isFollowingNow, setIsFollowingNow] = useState(true);

  const setYDomain = useCallback(
    (candidate: [Date, Date], causedByUserGesture: boolean) => {
      const clamped = clampYDomain(candidate, new Date(), config.yAxis);
      setYDomainState(clamped);
      if (causedByUserGesture) setIsFollowingNow(false);
    },
    [config.yAxis]
  );

  const resetToNow = useCallback(() => {
    setIsFollowingNow(true);
    setYDomainState(createDefaultYDomain(new Date(), config.yAxis));
  }, [config.yAxis]);

  const yScale = useMemo(() => createYScale(yDomain, dims.height), [yDomain, dims.height]);

  return { xForStation, yScale, yDomain, setYDomain, isFollowingNow, resetToNow };
}
