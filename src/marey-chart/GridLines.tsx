import { useMareyChartScales } from './MareyChartContext';

export function GridLines({ width }: { width: number }) {
  const { yScale } = useMareyChartScales();
  const ticks = yScale.ticks();

  return (
    <g data-testid="gridlines">
      {ticks.map((tick) => {
        const isWholeHour = tick.getMinutes() === 0;
        const y = yScale(tick);
        return (
          <line
            key={tick.getTime()}
            data-testid="gridline"
            x1={0}
            x2={width}
            y1={y}
            y2={y}
            stroke="currentColor"
            strokeDasharray={isWholeHour ? undefined : '2,3'}
          />
        );
      })}
    </g>
  );
}
