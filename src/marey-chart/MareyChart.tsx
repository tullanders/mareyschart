import { useContainerSize } from './useContainerSize';
import { useMareyScales } from './useMareyScales';
import { MareyChartProvider } from './MareyChartContext';
import { XAxis } from './XAxis';
import { GridLines } from './GridLines';
import { YAxis } from './YAxis';
import { TrainLayer } from './TrainLayer';
import { defaultConfig } from './config';
import type { MareyChartConfig, Station, Train } from './types';

export type MareyChartProps = {
  stations: Station[];
  trains: Train[];
  config?: MareyChartConfig;
};

export function MareyChart({ stations, trains, config = defaultConfig }: MareyChartProps) {
  const [containerRef, size] = useContainerSize<HTMLDivElement>();
  const scales = useMareyScales(stations, config, size);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <svg data-testid="marey-chart-svg" width={size.width} height={size.height}>
        <MareyChartProvider value={scales}>
          <GridLines width={size.width} />
          <XAxis stations={stations} />
          <YAxis width={size.width} />
          <TrainLayer trains={trains} />
        </MareyChartProvider>
      </svg>
    </div>
  );
}
