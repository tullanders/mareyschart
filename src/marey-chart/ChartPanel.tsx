import type { ScaleTime } from 'd3-scale';
import { GridLines } from './GridLines';
import { XAxis } from './XAxis';
import { YAxis } from './YAxis';
import { TrainLayer } from './TrainLayer';
import { NowLine } from './NowLine';
import { MareyChartProvider } from './MareyChartContext';
import { useXForStation } from './useXForStation';
import type { MareyChartConfig, Station, Train } from './types';

export type ChartPanelProps = {
  stations: Station[];
  trains: Train[];
  width: number;
  height: number;
  config: MareyChartConfig;
  yScale: ScaleTime<number, number>;
  yDomain: [Date, Date];
  setYDomain: (candidate: [Date, Date], causedByUserGesture: boolean) => void;
  isFollowingNow: boolean;
  resetToNow: () => void;
  showLeftLabels: boolean;
  showRightLabels: boolean;
  showResetButton: boolean;
};

export function ChartPanel({
  stations,
  trains,
  width,
  height,
  config,
  yScale,
  yDomain,
  setYDomain,
  isFollowingNow,
  resetToNow,
  showLeftLabels,
  showRightLabels,
  showResetButton,
}: ChartPanelProps) {
  const xForStation = useXForStation(stations, config.xAxis, width);

  return (
    <MareyChartProvider
      value={{ xForStation, yScale, yDomain, setYDomain, isFollowingNow, resetToNow }}
    >
      <GridLines width={width} />
      <XAxis stations={stations} height={height} />
      <YAxis
        width={width}
        height={height}
        showLeftLabels={showLeftLabels}
        showRightLabels={showRightLabels}
        showResetButton={showResetButton}
      />
      <TrainLayer trains={trains} />
      <NowLine width={width} color={config.yAxis.colors.nowLine} />
    </MareyChartProvider>
  );
}
