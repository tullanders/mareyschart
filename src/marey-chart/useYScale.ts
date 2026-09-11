import { useCallback, useEffect, useMemo, useState } from 'react';
import { createDefaultYDomain, createYScale } from './yScale';
import { clampYDomain } from './clampYDomain';
import type { MareyChartConfig } from './types';

export function useYScale(config: MareyChartConfig['yAxis'], height: number) {
  const [yDomain, setYDomainState] = useState<[Date, Date]>(() =>
    createDefaultYDomain(new Date(), config)
  );
  const [isFollowingNow, setIsFollowingNow] = useState(true);

  const setYDomain = useCallback(
    (candidate: [Date, Date], causedByUserGesture: boolean) => {
      const clamped = clampYDomain(candidate, new Date(), config);
      setYDomainState(clamped);
      if (causedByUserGesture) setIsFollowingNow(false);
    },
    [config]
  );

  const resetToNow = useCallback(() => {
    setIsFollowingNow(true);
    setYDomainState(createDefaultYDomain(new Date(), config));
  }, [config]);

  useEffect(() => {
    if (!isFollowingNow) return;
    const intervalId = setInterval(() => {
      setYDomainState(createDefaultYDomain(new Date(), config));
    }, config.mechanicalRefreshIntervalMs);
    return () => clearInterval(intervalId);
  }, [isFollowingNow, config]);

  const yScale = useMemo(() => createYScale(yDomain, height), [yDomain, height]);

  return { yScale, yDomain, setYDomain, isFollowingNow, resetToNow };
}
