import { useContainerSize } from './useContainerSize';
import { useYScale } from './useYScale';
import { computePanelLayout } from './panelLayout';
import { ChartPanel } from './ChartPanel';
import { defaultConfig } from './config';
import type { MareyChartConfig, MareyChartPanel } from './types';

export type MareyChartProps = {
  panels: MareyChartPanel[];
  config?: MareyChartConfig;
};

/** Horizontal space reserved on each side of the plot area for y-axis time labels. */
const Y_AXIS_LABEL_MARGIN = 64;
/** Vertical space reserved above and below the plot area for x-axis station labels. */
const X_AXIS_LABEL_MARGIN = 28;
/** Horizontal gap between adjacent panels, reusing the x-axis label margin. */
const PANEL_GAP = X_AXIS_LABEL_MARGIN;

export function MareyChart({ panels, config = defaultConfig }: MareyChartProps) {
  const [containerRef, size] = useContainerSize<HTMLDivElement>();
  const plotWidth = Math.max(size.width - Y_AXIS_LABEL_MARGIN * 2, 0);
  const plotHeight = Math.max(size.height - X_AXIS_LABEL_MARGIN * 2, 0);
  const { yScale, yDomain, setYDomain, isFollowingNow, resetToNow } = useYScale(
    config.yAxis,
    plotHeight
  );

  const layouts = computePanelLayout(
    panels.map((panel) => panel.stations.length),
    plotWidth,
    PANEL_GAP
  );

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <svg data-testid="marey-chart-svg" width={size.width} height={size.height}>
        <g transform={`translate(${Y_AXIS_LABEL_MARGIN}, ${X_AXIS_LABEL_MARGIN})`}>
          {panels.map((panel, index) => {
            const layout = layouts[index];
            const isFirst = index === 0;
            const isLast = index === panels.length - 1;
            return (
              <g
                key={panel.id}
                data-testid={`chart-panel-${panel.id}`}
                transform={`translate(${layout.x}, 0)`}
              >
                <ChartPanel
                  stations={panel.stations}
                  trains={panel.trains}
                  width={layout.width}
                  height={plotHeight}
                  config={config}
                  yScale={yScale}
                  yDomain={yDomain}
                  setYDomain={setYDomain}
                  isFollowingNow={isFollowingNow}
                  resetToNow={resetToNow}
                  showLeftLabels={isFirst}
                  showRightLabels={isLast}
                  showResetButton={isFirst}
                />
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
