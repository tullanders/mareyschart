import { useMareyChartScales } from './MareyChartContext';

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function YAxis({ width }: { width: number }) {
  const { yScale } = useMareyChartScales();
  const ticks = yScale.ticks();

  return (
    <g data-testid="y-axis">
      {ticks.map((tick) => (
        <text key={`left-${tick.getTime()}`} data-testid="y-label-left" x={0} y={yScale(tick)}>
          {formatTime(tick)}
        </text>
      ))}
      {ticks.map((tick) => (
        <text key={`right-${tick.getTime()}`} data-testid="y-label-right" x={width} y={yScale(tick)}>
          {formatTime(tick)}
        </text>
      ))}
    </g>
  );
}
