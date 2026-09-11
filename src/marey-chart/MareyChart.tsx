import { useContainerSize } from './useContainerSize';
import type { Station, Train } from './types';

export type MareyChartProps = {
  stations: Station[];
  trains: Train[];
};

export function MareyChart({ stations: _stations, trains: _trains }: MareyChartProps) {
  const [containerRef, size] = useContainerSize<HTMLDivElement>();

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <svg data-testid="marey-chart-svg" width={size.width} height={size.height} />
    </div>
  );
}
