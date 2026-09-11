import { useEffect, useRef } from 'react';
import { select } from 'd3-selection';
import { zoom as d3Zoom, zoomIdentity, type D3ZoomEvent } from 'd3-zoom';
import { useMareyChartScales } from './MareyChartContext';

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function YAxis({ width, height }: { width: number; height: number }) {
  const { yScale, yDomain, setYDomain, resetToNow } = useMareyChartScales();
  const surfaceRef = useRef<SVGRectElement>(null);

  // d3-zoom accumulates its transform on the DOM node across the whole
  // gesture (and beyond, until explicitly reset). We must compare that
  // cumulative transform against a domain snapshot taken at the SAME
  // moment — captured once per gesture (on 'start'), not re-derived from
  // React state on every 'zoom' tick — otherwise each tick's effect gets
  // re-applied on top of an already-updated base and compounds runaway,
  // which is what made panning/zooming get stuck at the min/max bound.
  const yDomainRef = useRef(yDomain);
  const setYDomainRef = useRef(setYDomain);
  const gestureBaseRef = useRef<[Date, Date] | null>(null);

  useEffect(() => {
    yDomainRef.current = yDomain;
  }, [yDomain]);

  useEffect(() => {
    setYDomainRef.current = setYDomain;
  }, [setYDomain]);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;

    const selection = select(surface);

    const behavior = d3Zoom<SVGRectElement, unknown>()
      // jsdom doesn't implement SVGElement.ownerSVGElement.viewBox, which
      // d3-zoom's defaultExtent relies on — supply the extent explicitly.
      .extent([
        [0, 0],
        [width, height],
      ])
      .on('start', () => {
        gestureBaseRef.current = yDomainRef.current ?? null;
      })
      .on('zoom', (event: D3ZoomEvent<SVGRectElement, unknown>) => {
        const base = gestureBaseRef.current;
        const setter = setYDomainRef.current;
        if (!base || !setter) return;

        const baseDurationMs = base[1].getTime() - base[0].getTime();
        const baseMidpointMs = (base[0].getTime() + base[1].getTime()) / 2;
        const { k, y } = event.transform;
        const newDurationMs = baseDurationMs / k;
        const centerMs = baseMidpointMs - (y / height) * baseDurationMs;
        const candidate: [Date, Date] = [
          new Date(centerMs - newDurationMs / 2),
          new Date(centerMs + newDurationMs / 2),
        ];
        setter(candidate, event.sourceEvent != null);
      })
      .on('end', () => {
        // Reset the node's stored transform so the next gesture starts
        // clean instead of continuing to accumulate on top of this one.
        selection.property('__zoom', zoomIdentity);
        gestureBaseRef.current = null;
      });

    selection.call(behavior);
    return () => {
      selection.on('.zoom', null);
    };
  }, [width, height]);

  const ticks = yScale.ticks();

  return (
    <g data-testid="y-axis">
      <rect
        ref={surfaceRef}
        data-testid="y-axis-zoom-surface"
        x={0}
        y={0}
        width={width}
        height={height}
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
