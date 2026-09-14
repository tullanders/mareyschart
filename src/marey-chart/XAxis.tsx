import { useMareyChartScales } from './MareyChartContext';
import type { Station } from './types';

const LABEL_GAP = 8;
const FONT_SIZE = 11;

export function XAxis({ stations, height }: { stations: Station[]; height: number }) {
  const { xForStation } = useMareyChartScales();

  return (
    <g data-testid="x-axis">
      {stations.map((station) => {
        const x = xForStation.get(station.id) ?? 0;
        return (
          <line
            key={station.id}
            data-testid="x-gridline"
            x1={x}
            x2={x}
            y1={0}
            y2={height}
            stroke="currentColor"
          />
        );
      })}
      {stations.map((station) => (
        <text
          key={`top-${station.id}`}
          x={xForStation.get(station.id) ?? 0}
          y={-LABEL_GAP}
          textAnchor="middle"
          fontSize={FONT_SIZE}
          fill="currentColor"
        >
          {station.name}
        </text>
      ))}
      {stations.map((station) => (
        <text
          key={`bottom-${station.id}`}
          x={xForStation.get(station.id) ?? 0}
          y={height + LABEL_GAP}
          textAnchor="middle"
          dominantBaseline="hanging"
          fontSize={FONT_SIZE}
          fill="currentColor"
        >
          {station.name}
        </text>
      ))}
    </g>
  );
}
