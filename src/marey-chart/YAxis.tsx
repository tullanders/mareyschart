import { useEffect, useRef } from 'react';
import { select } from 'd3-selection';
import { zoom as d3Zoom, type D3ZoomEvent } from 'd3-zoom';
import { useMareyChartScales } from './MareyChartContext';

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function YAxis({ width }: { width: number }) {
  const { yScale, yDomain, setYDomain, resetToNow } = useMareyChartScales();
  const surfaceRef = useRef<SVGRectElement>(null);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface || !yDomain || !setYDomain) return;

    const baseDomain = yDomain;
    const baseDurationMs = baseDomain[1].getTime() - baseDomain[0].getTime();
    const baseMidpointMs = (baseDomain[0].getTime() + baseDomain[1].getTime()) / 2;

    const height = yScale.range()[1] || 1;

    const behavior = d3Zoom<SVGRectElement, unknown>()
      // jsdom doesn't implement SVGElement.ownerSVGElement.viewBox, which
      // d3-zoom's defaultExtent relies on — supply the extent explicitly.
      .extent([
        [0, 0],
        [width, height],
      ])
      .on('zoom', (event: D3ZoomEvent<SVGRectElement, unknown>) => {
        const { k, y } = event.transform;
        const newDurationMs = baseDurationMs / k;
        const centerMs = baseMidpointMs - (y / height) * baseDurationMs;
        const candidate: [Date, Date] = [
          new Date(centerMs - newDurationMs / 2),
          new Date(centerMs + newDurationMs / 2),
        ];
        setYDomain(candidate, event.sourceEvent != null);
      });

    select(surface).call(behavior);
    return () => {
      select(surface).on('.zoom', null);
    };
  }, [yDomain, yScale, setYDomain, width]);

  const ticks = yScale.ticks();

  return (
    <g data-testid="y-axis">
      <rect
        ref={surfaceRef}
        data-testid="y-axis-zoom-surface"
        x={0}
        y={0}
        width={width}
        height={yScale.range()[1]}
        fill="transparent"
      />
      {ticks.map((tick) => (
        <text
          key={`left-${tick.getTime()}`}
          data-testid="y-label-left"
          x={-8}
          y={yScale(tick)}
          textAnchor="end"
          dominantBaseline="middle"
          fontSize={11}
        >
          {formatTime(tick)}
        </text>
      ))}
      {ticks.map((tick) => (
        <text
          key={`right-${tick.getTime()}`}
          data-testid="y-label-right"
          x={width + 8}
          y={yScale(tick)}
          textAnchor="start"
          dominantBaseline="middle"
          fontSize={11}
        >
          {formatTime(tick)}
        </text>
      ))}
      {resetToNow && (
        <foreignObject x={width / 2 - 40} y={0} width={80} height={24}>
          <button type="button" onClick={resetToNow}>
            Återställ
          </button>
        </foreignObject>
      )}
    </g>
  );
}
