import { useEffect, useRef } from 'react';
import { select } from 'd3-selection';
import { line as d3Line } from 'd3-shape';
import { useMareyChartScales } from './MareyChartContext';
import type { Train } from './types';

export function TrainLine({ train }: { train: Train }) {
  const pathRef = useRef<SVGPathElement>(null);
  const { xForStation, yScale } = useMareyChartScales();

  useEffect(() => {
    const knownPoints = train.points
      .filter((point) => xForStation.has(point.place))
      .map((point) => [xForStation.get(point.place)!, yScale(point.time)] as [number, number]);

    const path = d3Line()(knownPoints) ?? '';
    select(pathRef.current).attr('d', path);
  }, [train, xForStation, yScale]);

  return <path ref={pathRef} data-testid="train-line" fill="none" stroke="currentColor" />;
}
