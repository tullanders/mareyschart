import { useMareyChartScales } from './MareyChartContext';
import type { Station } from './types';

export function XAxis({ stations }: { stations: Station[] }) {
  const { xForStation } = useMareyChartScales();

  return (
    <g data-testid="x-axis">
      {stations.map((station) => (
        <text key={station.id} x={xForStation.get(station.id) ?? 0} y={0}>
          {station.name}
        </text>
      ))}
    </g>
  );
}
