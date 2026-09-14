import { scaleTime } from 'd3-scale';
import type { MareyChartConfig } from './types';

export function createDefaultYDomain(now: Date, yConfig: MareyChartConfig['yAxis']): [Date, Date] {
  return [new Date(now.getTime() - yConfig.defaultPastMs), new Date(now.getTime() + yConfig.defaultFutureMs)];
}

export function createYScale(domain: [Date, Date], height: number) {
  return scaleTime().domain(domain).range([height, 0]);
}
