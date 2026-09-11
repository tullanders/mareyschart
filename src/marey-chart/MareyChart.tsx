import { useContainerSize } from './useContainerSize';
import { useMareyScales } from './useMareyScales';
import { MareyChartProvider } from './MareyChartContext';
import { XAxis } from './XAxis';
import { GridLines } from './GridLines';
import { YAxis } from './YAxis';
import { TrainLayer } from './TrainLayer';
import { NowLine } from './NowLine';
import { defaultConfig } from './config';
import type { MareyChartConfig, Station, Train } from './types';

export type MareyChartProps = {
  stations: Station[];
  trains: Train[];
  config?: MareyChartConfig;
};

/** Horizontal space reserved on each side of the plot area for y-axis time labels. */
const Y_AXIS_LABEL_MARGIN = 64;
/** Vertical space reserved above and below the plot area for x-axis station labels. */
const X_AXIS_LABEL_MARGIN = 28;

export function MareyChart({ stations, trains, config = defaultConfig }: MareyChartProps) {
  const [containerRef, size] = useContainerSize<HTMLDivElement>();
  const plotWidth = Math.max(size.width - Y_AXIS_LABEL_MARGIN * 2, 0);
  const plotHeight = Math.max(size.height - X_AXIS_LABEL_MARGIN * 2, 0);
  const scales = useMareyScales(stations, config, { width: plotWidth, height: plotHeight });

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <svg data-testid="marey-chart-svg" width={size.width} height={size.height}>
        <MareyChartProvider value={scales}>
          <g transform={`translate(${Y_AXIS_LABEL_MARGIN}, ${X_AXIS_LABEL_MARGIN})`}>
            <GridLines width={plotWidth} />
            <XAxis stations={stations} height={plotHeight} />
            <YAxis width={plotWidth} height={plotHeight} />
            <TrainLayer trains={trains} />
            <NowLine width={plotWidth} color={config.yAxis.colors.nowLine} />
          </g>
        </MareyChartProvider>
      </svg>
    </div>
  );
}
