import { useEffect, useRef } from 'react';
import { select } from 'd3-selection';
import { useMareyChartScales } from './MareyChartContext';
import { defaultConfig } from './config';

export function NowLine({
  width,
  tickIntervalMs = 1000,
  color = defaultConfig.yAxis.colors.nowLine,
}: {
  width: number;
  tickIntervalMs?: number;
  color?: string;
}) {
  const lineRef = useRef<SVGLineElement>(null);
  const { yScale } = useMareyChartScales();

  useEffect(() => {
    const update = () => {
      const y = yScale(new Date());
      select(lineRef.current).attr('y1', y).attr('y2', y);
    };

    update();
    const intervalId = setInterval(update, tickIntervalMs);
    return () => clearInterval(intervalId);
  }, [yScale, tickIntervalMs]);

  return (
    <line ref={lineRef} data-testid="now-line" x1={0} x2={width} y1={0} y2={0} stroke={color} strokeWidth={2} />
  );
}
