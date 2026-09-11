import type { MareyChartConfig } from './types';

export function clampYDomain(
  rawDomain: [Date, Date],
  now: Date,
  yConfig: MareyChartConfig['yAxis']
): [Date, Date] {
  const rawStart = rawDomain[0].getTime();
  const rawEnd = rawDomain[1].getTime();
  const midpoint = (rawStart + rawEnd) / 2;

  const duration = Math.min(
    Math.max(rawEnd - rawStart, yConfig.zoomMinDurationMs),
    yConfig.zoomMaxDurationMs
  );

  let start = midpoint - duration / 2;
  let end = midpoint + duration / 2;

  const earliestAllowed = now.getTime() - yConfig.panBackLimitMs;
  const latestAllowed = now.getTime() + yConfig.panForwardLimitMs;

  if (start < earliestAllowed) {
    start = earliestAllowed;
    end = start + duration;
  }
  if (end > latestAllowed) {
    end = latestAllowed;
    start = end - duration;
  }

  return [new Date(start), new Date(end)];
}
