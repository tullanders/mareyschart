import type { MareyChartConfig } from './types';

export const defaultConfig: MareyChartConfig = {
  xAxis: {
    blendWeight: 0.4,
    minStationPixelGap: 24,
    maxSegmentShare: 0.35,
  },
  yAxis: {
    defaultPastMs: 15 * 60_000,
    defaultFutureMs: 60 * 60_000,
    panBackLimitMs: 15 * 60_000,
    panForwardLimitMs: 12 * 60 * 60_000,
    zoomMinDurationMs: 15 * 60_000,
    zoomMaxDurationMs: 6 * 60 * 60_000,
    mechanicalRefreshIntervalMs: 30_000,
    colors: {
      past: '#4b5563',
      future: '#111827',
      nowLine: '#dc2626',
    },
  },
};
