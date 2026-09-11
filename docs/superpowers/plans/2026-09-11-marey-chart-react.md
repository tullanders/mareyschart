# Marey Chart React Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `MareyChart` React component — a live-updating Marey's chart (stations on x, time on y) for PrognosGraf — as a sequence of small, independently testable and visually verifiable modules.

**Architecture:** React owns the DOM structure (mounted once); D3 owns imperative updates via refs for anything that changes at high frequency (train lines, the live "now" line), so hot data paths never trigger a React re-render. Scales are computed by hooks and shared via Context to `XAxis`, `YAxis`, `GridLines`, and the train layer. The x-axis is fixed (no zoom/pan); the y-axis is zoomable/pannable within bounds and can "follow now" or be frozen by the user.

**Tech Stack:** React 18 + TypeScript (strict), Vite, D3 v7 (`d3-scale`, `d3-selection`, `d3-zoom`, `d3-array`), Vitest + `@testing-library/react` + `jsdom` for tests.

**Spec:** [docs/superpowers/specs/2026-09-11-marey-chart-react-design.md](../specs/2026-09-11-marey-chart-react-design.md)

## Global Constraints

- React DOM structure is mounted once; D3 updates existing nodes via refs — never let D3 re-create nodes React already owns.
- The x-axis is never zoomable or pannable.
- The y-axis default visible window is -15 min to +60 min relative to now (75 min).
- The y-axis can never pan earlier than now-15min or later than now+12h, at any zoom level.
- The y-axis zoom range is a visible duration of 15 min (most zoomed in) to 6 h (most zoomed out).
- All colors, thresholds, and intervals in `MareyChartConfig` are configurable, never hardcoded in component logic.
- Every task must leave the app in a runnable, visually verifiable state (`npm run dev`) in addition to passing tests.

---

## File Structure

```
src/
  marey-chart/
    types.ts               # Station, TrainPoint, Train, MareyChartConfig
    config.ts               # defaultConfig: MareyChartConfig
    useContainerSize.ts      # ResizeObserver-based sizing hook
    MareyChartContext.tsx    # React Context carrying computed scales
    MareyChart.tsx           # top-level component, owns SVG + providers
    xAxisPositioning.ts      # computeBlendedPositions, applyPixelConstraints (pure)
    useMareyScales.ts        # combines x positions + y scale/domain state
    XAxis.tsx                # renders station ticks/labels along x
    yScale.ts                # createDefaultYDomain, time scale factory
    clampYDomain.ts          # pure pan/zoom domain clamping logic
    GridLines.tsx            # hour/10-min gridlines using d3 scale.ticks()
    YAxis.tsx                # y ticks/labels (both sides) + d3.zoom binding
    NowLine.tsx              # live "now" indicator, independent tick loop
    TrainLine.tsx            # single train polyline, D3-ref imperative update
    TrainLayer.tsx           # maps trains -> TrainLine
    index.ts                 # public exports
  test/
    setup.ts                 # jest-dom matchers, ResizeObserver stub
```

Each file has one responsibility; `xAxisPositioning.ts`, `clampYDomain.ts`, and `yScale.ts` are pure and DOM-free so they can be unit tested without rendering anything.

**Note on ordering vs. the spec's iteration list:** the spec lists the train layer before the y-axis basic flow. This plan builds the y-axis's fixed-domain scale first (Task 4) and trains second (Task 5), since a train's polyline needs a working y-scale to plot a meaningful position — plotting trains against an undefined y-axis would produce nothing visually verifiable. Zoom/pan interactivity (spec step 5) still comes after both, in Task 6.

---

### Task 1: Project scaffold, container sizing, MareyChart shell

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `src/main.tsx` (dev sandbox entry)
- Create: `src/test/setup.ts`
- Create: `src/marey-chart/useContainerSize.ts`
- Create: `src/marey-chart/useContainerSize.test.tsx`
- Create: `src/marey-chart/MareyChart.tsx`
- Create: `src/marey-chart/MareyChart.test.tsx`

**Interfaces:**
- Produces: `useContainerSize<T extends HTMLElement>(): [React.RefObject<T>, { width: number; height: number }]`
- Produces: `<MareyChart />` — renders a `<div>` wrapper filling 100% of its parent, containing an `<svg data-testid="marey-chart-svg">` sized to match the wrapper.

- [ ] **Step 1: Scaffold the Vite + React + TypeScript project**

```bash
npm create vite@latest . -- --template react-ts
npm install
npm install d3
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @types/d3
```

Add to `package.json` `scripts`: `"test": "vitest run"`.

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
});
```

Create `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 2: Run the test command to confirm the harness works with zero tests**

Run: `npm test`
Expected: Vitest reports "No test files found" (or passes with 0 tests) — confirms config is wired up before writing real tests.

- [ ] **Step 3: Write the failing test for `useContainerSize`**

```tsx
// src/marey-chart/useContainerSize.test.tsx
import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useContainerSize } from './useContainerSize';

let resizeCallback: ResizeObserverCallback = () => {};

class MockResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    resizeCallback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

function TestComponent() {
  const [ref, size] = useContainerSize<HTMLDivElement>();
  return (
    <div ref={ref} data-testid="wrapper">
      {size.width}x{size.height}
    </div>
  );
}

describe('useContainerSize', () => {
  it('updates size when the observed element resizes', () => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    const { getByTestId } = render(<TestComponent />);

    expect(getByTestId('wrapper').textContent).toBe('0x0');

    act(() => {
      resizeCallback(
        [{ contentRect: { width: 400, height: 300 } } as ResizeObserverEntry],
        {} as ResizeObserver
      );
    });

    expect(getByTestId('wrapper').textContent).toBe('400x300');
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test -- useContainerSize`
Expected: FAIL — `useContainerSize` module does not exist yet.

- [ ] **Step 5: Implement `useContainerSize`**

```ts
// src/marey-chart/useContainerSize.ts
import { useEffect, useRef, useState, type RefObject } from 'react';

export type ContainerSize = { width: number; height: number };

export function useContainerSize<T extends HTMLElement>(): [RefObject<T>, ContainerSize] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<ContainerSize>({ width: 0, height: 0 });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- useContainerSize`
Expected: PASS

- [ ] **Step 7: Write the failing test for `MareyChart`**

```tsx
// src/marey-chart/MareyChart.test.tsx
import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MareyChart } from './MareyChart';

let resizeCallback: ResizeObserverCallback = () => {};

class MockResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    resizeCallback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('MareyChart', () => {
  it('renders an svg matching the wrapper size', () => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    const { getByTestId } = render(<MareyChart stations={[]} trains={[]} />);

    act(() => {
      resizeCallback(
        [{ contentRect: { width: 500, height: 400 } } as ResizeObserverEntry],
        {} as ResizeObserver
      );
    });

    const svg = getByTestId('marey-chart-svg');
    expect(svg.getAttribute('width')).toBe('500');
    expect(svg.getAttribute('height')).toBe('400');
  });
});
```

- [ ] **Step 8: Run the test to verify it fails**

Run: `npm test -- MareyChart`
Expected: FAIL — `MareyChart` module does not exist, or props mismatch.

- [ ] **Step 9: Implement the `MareyChart` shell**

```tsx
// src/marey-chart/MareyChart.tsx
import { useContainerSize } from './useContainerSize';
import type { Station, Train } from './types';

export type MareyChartProps = {
  stations: Station[];
  trains: Train[];
};

export function MareyChart({ stations: _stations, trains: _trains }: MareyChartProps) {
  const [containerRef, size] = useContainerSize<HTMLDivElement>();

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <svg data-testid="marey-chart-svg" width={size.width} height={size.height} />
    </div>
  );
}
```

Create `src/marey-chart/types.ts` (used from here on by every task):

```ts
export type Station = {
  id: string;
  name: string;
  /** Cumulative real-world distance from the first station, in km. */
  distanceKm: number;
};

export type TrainPoint = {
  time: Date;
  place: string;
};

export type Train = {
  id: string;
  points: TrainPoint[];
};

export type MareyChartConfig = {
  xAxis: {
    /** 0 = fully equidistant, 1 = fully proportional to real distance. */
    blendWeight: number;
    minStationPixelGap: number;
    /** Max share (0-1) of the total width a single segment may occupy. */
    maxSegmentShare: number;
  };
  yAxis: {
    defaultPastMs: number;
    defaultFutureMs: number;
    panBackLimitMs: number;
    panForwardLimitMs: number;
    zoomMinDurationMs: number;
    zoomMaxDurationMs: number;
    mechanicalRefreshIntervalMs: number;
    colors: {
      past: string;
      future: string;
      nowLine: string;
    };
  };
};
```

Create `src/marey-chart/config.ts`:

```ts
import type { MareyChartConfig } from './types';

export const defaultConfig: MareyChartConfig = {
  xAxis: {
    blendWeight: 0.4,
    minStationPixelGap: 24,
    maxSegmentShare: 0.35,
  },
  yAxis: {
    defaultPastMs: 15 * 60_000,
    defaultFutureMs: 60 * 60_000,
    panBackLimitMs: 15 * 60_000,
    panForwardLimitMs: 12 * 60 * 60_000,
    zoomMinDurationMs: 15 * 60_000,
    zoomMaxDurationMs: 6 * 60 * 60_000,
    mechanicalRefreshIntervalMs: 30_000,
    colors: {
      past: '#4b5563',
      future: '#111827',
      nowLine: '#dc2626',
    },
  },
};
```

- [ ] **Step 10: Run the test to verify it passes**

Run: `npm test -- MareyChart`
Expected: PASS

- [ ] **Step 11: Visually verify**

Wire `src/main.tsx` to render `<MareyChart stations={[]} trains={[]} />` inside a container styled `height: 100vh`. Run `npm run dev`, confirm an (empty) SVG fills the browser window and resizes with it.

- [ ] **Step 12: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts vitest.config.ts index.html src/
git commit -m "feat: scaffold project and MareyChart shell with responsive sizing"
```

---

### Task 2: X-axis position calculation (pure functions)

**Files:**
- Create: `src/marey-chart/xAxisPositioning.ts`
- Create: `src/marey-chart/xAxisPositioning.test.ts`

**Interfaces:**
- Consumes: `Station` from `./types`
- Produces:
  - `computeBlendedPositions(stations: Station[], blendWeight: number): number[]` — returns one value per station in `[0, 1]`.
  - `applyPixelConstraints(blendedPositions: number[], width: number, minGap: number, maxShare: number): number[]` — returns one pixel x-coordinate per station, `[0, width]`.

- [ ] **Step 1: Write the failing tests for `computeBlendedPositions`**

```ts
// src/marey-chart/xAxisPositioning.test.ts
import { describe, expect, it } from 'vitest';
import { computeBlendedPositions, applyPixelConstraints } from './xAxisPositioning';
import type { Station } from './types';

const stations: Station[] = [
  { id: 'a', name: 'A', distanceKm: 0 },
  { id: 'b', name: 'B', distanceKm: 10 },
  { id: 'c', name: 'C', distanceKm: 100 },
];

describe('computeBlendedPositions', () => {
  it('is purely equidistant at weight 0', () => {
    const positions = computeBlendedPositions(stations, 0);
    expect(positions).toEqual([0, 0.5, 1]);
  });

  it('is purely proportional to distance at weight 1', () => {
    const positions = computeBlendedPositions(stations, 1);
    expect(positions[0]).toBeCloseTo(0);
    expect(positions[1]).toBeCloseTo(0.1);
    expect(positions[2]).toBeCloseTo(1);
  });

  it('blends linearly between the two at intermediate weights', () => {
    const positions = computeBlendedPositions(stations, 0.5);
    expect(positions[1]).toBeCloseTo((0.5 + 0.1) / 2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- xAxisPositioning`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `computeBlendedPositions`**

```ts
// src/marey-chart/xAxisPositioning.ts
import type { Station } from './types';

export function computeBlendedPositions(stations: Station[], blendWeight: number): number[] {
  const n = stations.length;
  if (n === 0) return [];
  if (n === 1) return [0];

  const totalDistance = stations[n - 1].distanceKm - stations[0].distanceKm;

  return stations.map((station, i) => {
    const ordinal = i / (n - 1);
    const real =
      totalDistance === 0 ? ordinal : (station.distanceKm - stations[0].distanceKm) / totalDistance;
    return ordinal * (1 - blendWeight) + real * blendWeight;
  });
}
```

- [ ] **Step 4: Run tests to verify `computeBlendedPositions` passes**

Run: `npm test -- xAxisPositioning`
Expected: The three `computeBlendedPositions` tests PASS; `applyPixelConstraints` tests fail (not yet written).

- [ ] **Step 5: Write the failing tests for `applyPixelConstraints`**

```ts
// append to src/marey-chart/xAxisPositioning.test.ts
describe('applyPixelConstraints', () => {
  it('spaces stations proportionally when no constraint binds', () => {
    const positions = applyPixelConstraints([0, 0.5, 1], 1000, 10, 0.9);
    expect(positions[0]).toBeCloseTo(0);
    expect(positions[1]).toBeCloseTo(500);
    expect(positions[2]).toBeCloseTo(1000);
  });

  it('pushes apart stations closer than the minimum pixel gap', () => {
    // Raw fractions imply a 5px gap between index 0 and 1 on a 1000px width.
    const positions = applyPixelConstraints([0, 0.005, 1], 1000, 50, 0.9);
    expect(positions[1] - positions[0]).toBeGreaterThanOrEqual(49); // allow rounding
  });

  it('shrinks a segment that would exceed the max share of total width', () => {
    const unconstrained = applyPixelConstraints([0, 0.9, 1], 1000, 1, 1);
    const constrained = applyPixelConstraints([0, 0.9, 1], 1000, 1, 0.3);
    const unconstrainedShare = (unconstrained[1] - unconstrained[0]) / 1000;
    const constrainedShare = (constrained[1] - constrained[0]) / 1000;
    expect(constrainedShare).toBeLessThan(unconstrainedShare);
  });
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `npm test -- xAxisPositioning`
Expected: FAIL — `applyPixelConstraints` not exported.

- [ ] **Step 7: Implement `applyPixelConstraints`**

Single-pass, best-effort constraint solver: convert blended positions to segment-length fractions, clamp each fraction into `[minGapFraction, maxShare]`, renormalize so fractions sum to 1, then scale to pixel width. This is deliberately not iterative — with typical station counts a single clamp-and-renormalize pass is enough, and it stays simple to reason about and test.

```ts
export function applyPixelConstraints(
  blendedPositions: number[],
  width: number,
  minGap: number,
  maxShare: number
): number[] {
  const n = blendedPositions.length;
  if (n === 0) return [];
  if (n === 1) return [0];

  const minGapFraction = width === 0 ? 0 : minGap / width;

  const rawFractions: number[] = [];
  for (let i = 1; i < n; i++) {
    rawFractions.push(blendedPositions[i] - blendedPositions[i - 1]);
  }

  const clamped = rawFractions.map((f) => Math.min(Math.max(f, minGapFraction), maxShare));
  const total = clamped.reduce((sum, f) => sum + f, 0);
  const normalized = total === 0 ? clamped : clamped.map((f) => f / total);

  const positions = [0];
  for (const fraction of normalized) {
    positions.push(positions[positions.length - 1] + fraction);
  }

  return positions.map((p) => p * width);
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npm test -- xAxisPositioning`
Expected: PASS (all six tests)

- [ ] **Step 9: Commit**

```bash
git add src/marey-chart/xAxisPositioning.ts src/marey-chart/xAxisPositioning.test.ts
git commit -m "feat: add pure x-axis position calculation (blend + pixel constraints)"
```

---

### Task 3: X-axis scale integration and rendering

**Files:**
- Create: `src/marey-chart/MareyChartContext.tsx`
- Create: `src/marey-chart/useMareyScales.ts`
- Create: `src/marey-chart/useMareyScales.test.ts`
- Create: `src/marey-chart/XAxis.tsx`
- Create: `src/marey-chart/XAxis.test.tsx`
- Modify: `src/marey-chart/MareyChart.tsx` — accept `config`, wire up scales + `XAxis`

**Interfaces:**
- Consumes: `computeBlendedPositions`, `applyPixelConstraints` from `./xAxisPositioning`; `Station`, `MareyChartConfig` from `./types`
- Produces:
  - `useMareyScales(stations: Station[], config: MareyChartConfig, dims: { width: number; height: number }): { xForStation: Map<string, number> }` (grows in later tasks)
  - `<MareyChartProvider value={scales}>` / `useMareyChartScales()` context pair
  - `<XAxis stations={stations} />` — renders one `<text>` label per station at its `xForStation` position, along the bottom of the chart

- [ ] **Step 1: Write the failing test for `useMareyScales`**

```ts
// src/marey-chart/useMareyScales.test.ts
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useMareyScales } from './useMareyScales';
import { defaultConfig } from './config';
import type { Station } from './types';

const stations: Station[] = [
  { id: 'a', name: 'A', distanceKm: 0 },
  { id: 'b', name: 'B', distanceKm: 50 },
  { id: 'c', name: 'C', distanceKm: 100 },
];

describe('useMareyScales', () => {
  it('memoizes x positions on stations and config, not on unrelated re-renders', () => {
    const dims = { width: 1000, height: 600 };
    const { result, rerender } = renderHook(
      ({ s, c }) => useMareyScales(s, c, dims),
      { initialProps: { s: stations, c: defaultConfig } }
    );

    const firstMap = result.current.xForStation;
    expect(firstMap.get('a')).toBeCloseTo(0);
    expect(firstMap.get('c')).toBeCloseTo(1000);

    rerender({ s: stations, c: defaultConfig });
    expect(result.current.xForStation).toBe(firstMap); // same reference: memoized
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useMareyScales`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `useMareyScales` (x part)**

```ts
// src/marey-chart/useMareyScales.ts
import { useMemo } from 'react';
import { applyPixelConstraints, computeBlendedPositions } from './xAxisPositioning';
import type { MareyChartConfig, Station } from './types';

export type ChartDims = { width: number; height: number };

export function useMareyScales(stations: Station[], config: MareyChartConfig, dims: ChartDims) {
  const xForStation = useMemo(() => {
    const blended = computeBlendedPositions(stations, config.xAxis.blendWeight);
    const pixels = applyPixelConstraints(
      blended,
      dims.width,
      config.xAxis.minStationPixelGap,
      config.xAxis.maxSegmentShare
    );
    return new Map(stations.map((station, i) => [station.id, pixels[i]]));
  }, [stations, config.xAxis.blendWeight, config.xAxis.minStationPixelGap, config.xAxis.maxSegmentShare, dims.width]);

  return { xForStation };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- useMareyScales`
Expected: PASS

- [ ] **Step 5: Write the failing test for `XAxis`**

```tsx
// src/marey-chart/XAxis.test.tsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { XAxis } from './XAxis';
import { MareyChartProvider } from './MareyChartContext';
import type { Station } from './types';

const stations: Station[] = [
  { id: 'a', name: 'Alpha', distanceKm: 0 },
  { id: 'b', name: 'Beta', distanceKm: 10 },
];

describe('XAxis', () => {
  it('renders one label per station at its computed x position', () => {
    const xForStation = new Map([
      ['a', 0],
      ['b', 200],
    ]);
    const { getByText } = render(
      <MareyChartProvider value={{ xForStation }}>
        <svg>
          <XAxis stations={stations} />
        </svg>
      </MareyChartProvider>
    );

    expect(getByText('Alpha')).toHaveAttribute('x', '0');
    expect(getByText('Beta')).toHaveAttribute('x', '200');
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- XAxis`
Expected: FAIL — `MareyChartContext` and `XAxis` do not exist.

- [ ] **Step 7: Implement `MareyChartContext` and `XAxis`**

```tsx
// src/marey-chart/MareyChartContext.tsx
import { createContext, useContext, type ReactNode } from 'react';

export type MareyChartScales = {
  xForStation: Map<string, number>;
};

const MareyChartContext = createContext<MareyChartScales | null>(null);

export function MareyChartProvider({
  value,
  children,
}: {
  value: MareyChartScales;
  children: ReactNode;
}) {
  return <MareyChartContext.Provider value={value}>{children}</MareyChartContext.Provider>;
}

export function useMareyChartScales(): MareyChartScales {
  const scales = useContext(MareyChartContext);
  if (!scales) throw new Error('useMareyChartScales must be used within MareyChartProvider');
  return scales;
}
```

```tsx
// src/marey-chart/XAxis.tsx
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
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- XAxis`
Expected: PASS

- [ ] **Step 9: Wire `XAxis` into `MareyChart`**

```tsx
// src/marey-chart/MareyChart.tsx
import { useContainerSize } from './useContainerSize';
import { useMareyScales } from './useMareyScales';
import { MareyChartProvider } from './MareyChartContext';
import { XAxis } from './XAxis';
import { defaultConfig } from './config';
import type { MareyChartConfig, Station, Train } from './types';

export type MareyChartProps = {
  stations: Station[];
  trains: Train[];
  config?: MareyChartConfig;
};

export function MareyChart({ stations, trains: _trains, config = defaultConfig }: MareyChartProps) {
  const [containerRef, size] = useContainerSize<HTMLDivElement>();
  const scales = useMareyScales(stations, config, size);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <svg data-testid="marey-chart-svg" width={size.width} height={size.height}>
        <MareyChartProvider value={scales}>
          <XAxis stations={stations} />
        </MareyChartProvider>
      </svg>
    </div>
  );
}
```

- [ ] **Step 10: Visually verify**

In `src/main.tsx`, pass a handful of mock stations with varying `distanceKm`. Run `npm run dev`, confirm station labels appear spaced according to the blend weight.

- [ ] **Step 11: Commit**

```bash
git add src/marey-chart/MareyChartContext.tsx src/marey-chart/useMareyScales.ts src/marey-chart/useMareyScales.test.ts src/marey-chart/XAxis.tsx src/marey-chart/XAxis.test.tsx src/marey-chart/MareyChart.tsx
git commit -m "feat: integrate x-axis scale and render station labels"
```

---

### Task 4: Y-axis fixed-domain scale, gridlines, axis rendering

**Files:**
- Create: `src/marey-chart/yScale.ts`
- Create: `src/marey-chart/yScale.test.ts`
- Create: `src/marey-chart/GridLines.tsx`
- Create: `src/marey-chart/GridLines.test.tsx`
- Create: `src/marey-chart/YAxis.tsx`
- Create: `src/marey-chart/YAxis.test.tsx`
- Modify: `src/marey-chart/useMareyScales.ts` — add fixed y-scale (no zoom/pan yet)
- Modify: `src/marey-chart/MareyChartContext.tsx` — extend `MareyChartScales` with `yScale`
- Modify: `src/marey-chart/MareyChart.tsx` — render `GridLines` and `YAxis`

**Interfaces:**
- Produces: `createDefaultYDomain(now: Date, config: MareyChartConfig['yAxis']): [Date, Date]` — returns `[now - defaultPastMs, now + defaultFutureMs]`.
- Produces: `MareyChartScales.yScale: d3.ScaleTime<number, number>` (range `[0, height]`, domain from `createDefaultYDomain`)
- Produces: `<GridLines width={number} />`, `<YAxis width={number} />` reading `yScale` from context

- [ ] **Step 1: Write the failing test for `createDefaultYDomain`**

```ts
// src/marey-chart/yScale.test.ts
import { describe, expect, it } from 'vitest';
import { createDefaultYDomain } from './yScale';
import { defaultConfig } from './config';

describe('createDefaultYDomain', () => {
  it('spans 15 minutes before now to 60 minutes after now', () => {
    const now = new Date('2026-01-01T12:00:00Z');
    const [start, end] = createDefaultYDomain(now, defaultConfig.yAxis);

    expect(start.getTime()).toBe(now.getTime() - 15 * 60_000);
    expect(end.getTime()).toBe(now.getTime() + 60 * 60_000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- yScale`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `yScale.ts`**

```ts
// src/marey-chart/yScale.ts
import { scaleTime } from 'd3-scale';
import type { MareyChartConfig } from './types';

export function createDefaultYDomain(now: Date, yConfig: MareyChartConfig['yAxis']): [Date, Date] {
  return [new Date(now.getTime() - yConfig.defaultPastMs), new Date(now.getTime() + yConfig.defaultFutureMs)];
}

export function createYScale(domain: [Date, Date], height: number) {
  return scaleTime().domain(domain).range([0, height]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- yScale`
Expected: PASS

- [ ] **Step 5: Extend `useMareyScales` and context with the y-scale**

```ts
// src/marey-chart/useMareyScales.ts (add alongside existing x logic)
import { useMemo, useState } from 'react';
import { createDefaultYDomain, createYScale } from './yScale';
// ...existing imports

export function useMareyScales(stations: Station[], config: MareyChartConfig, dims: ChartDims) {
  const xForStation = useMemo(/* unchanged from Task 3 */ () => {
    const blended = computeBlendedPositions(stations, config.xAxis.blendWeight);
    const pixels = applyPixelConstraints(
      blended,
      dims.width,
      config.xAxis.minStationPixelGap,
      config.xAxis.maxSegmentShare
    );
    return new Map(stations.map((station, i) => [station.id, pixels[i]]));
  }, [stations, config.xAxis.blendWeight, config.xAxis.minStationPixelGap, config.xAxis.maxSegmentShare, dims.width]);

  const [yDomain] = useState<[Date, Date]>(() => createDefaultYDomain(new Date(), config.yAxis));
  const yScale = useMemo(() => createYScale(yDomain, dims.height), [yDomain, dims.height]);

  return { xForStation, yScale };
}
```

Update `MareyChartScales` in `MareyChartContext.tsx`:

```ts
export type MareyChartScales = {
  xForStation: Map<string, number>;
  yScale: import('d3-scale').ScaleTime<number, number>;
};
```

- [ ] **Step 6: Write the failing test for `GridLines`**

```tsx
// src/marey-chart/GridLines.test.tsx
import { render } from '@testing-library/react';
import { scaleTime } from 'd3-scale';
import { describe, expect, it } from 'vitest';
import { GridLines } from './GridLines';
import { MareyChartProvider } from './MareyChartContext';

describe('GridLines', () => {
  it('renders one line per scale tick', () => {
    const yScale = scaleTime()
      .domain([new Date('2026-01-01T12:00:00Z'), new Date('2026-01-01T13:15:00Z')])
      .range([0, 600]);

    const { container } = render(
      <MareyChartProvider value={{ xForStation: new Map(), yScale }}>
        <svg>
          <GridLines width={600} />
        </svg>
      </MareyChartProvider>
    );

    const lines = container.querySelectorAll('[data-testid="gridline"]');
    expect(lines.length).toBe(yScale.ticks().length);
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npm test -- GridLines`
Expected: FAIL — `GridLines` does not exist.

- [ ] **Step 8: Implement `GridLines`**

Uses d3's own `scale.ticks()` for now (per spec, the exact "every 10 minutes" density is deferred); distinguishes whole-hour ticks (solid) from others (dashed). Gridlines span the chart's full width, passed in as a prop from `MareyChart`.

```tsx
// src/marey-chart/GridLines.tsx
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
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npm test -- GridLines`
Expected: PASS

- [ ] **Step 10: Write the failing test for `YAxis`**

```tsx
// src/marey-chart/YAxis.test.tsx
import { render } from '@testing-library/react';
import { scaleTime } from 'd3-scale';
import { describe, expect, it } from 'vitest';
import { YAxis } from './YAxis';
import { MareyChartProvider } from './MareyChartContext';

describe('YAxis', () => {
  it('renders a time label on both sides for each tick', () => {
    const yScale = scaleTime()
      .domain([new Date('2026-01-01T12:00:00Z'), new Date('2026-01-01T12:20:00Z')])
      .range([0, 200]);

    const { getAllByTestId } = render(
      <MareyChartProvider value={{ xForStation: new Map(), yScale }}>
        <svg>
          <YAxis width={400} />
        </svg>
      </MareyChartProvider>
    );

    const leftLabels = getAllByTestId('y-label-left');
    const rightLabels = getAllByTestId('y-label-right');
    expect(leftLabels.length).toBe(yScale.ticks().length);
    expect(rightLabels.length).toBe(yScale.ticks().length);
  });
});
```

- [ ] **Step 11: Run test to verify it fails**

Run: `npm test -- YAxis`
Expected: FAIL — `YAxis` does not exist.

- [ ] **Step 12: Implement `YAxis`**

```tsx
// src/marey-chart/YAxis.tsx
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
```

- [ ] **Step 13: Run test to verify it passes**

Run: `npm test -- YAxis`
Expected: PASS

- [ ] **Step 14: Wire `GridLines` and `YAxis` into `MareyChart`**

```tsx
// src/marey-chart/MareyChart.tsx (relevant excerpt)
<MareyChartProvider value={scales}>
  <GridLines width={size.width} />
  <XAxis stations={stations} />
  <YAxis width={size.width} />
</MareyChartProvider>
```

- [ ] **Step 15: Visually verify**

Run `npm run dev`. Confirm horizontal gridlines appear (solid on the hour, dashed otherwise) and time labels appear on both left and right edges.

- [ ] **Step 16: Commit**

```bash
git add src/marey-chart/yScale.ts src/marey-chart/yScale.test.ts src/marey-chart/GridLines.tsx src/marey-chart/GridLines.test.tsx src/marey-chart/YAxis.tsx src/marey-chart/YAxis.test.tsx src/marey-chart/useMareyScales.ts src/marey-chart/MareyChartContext.tsx src/marey-chart/MareyChart.tsx
git commit -m "feat: add fixed-domain y-scale, gridlines, and y-axis labels"
```

---

### Task 5: Train rendering

**Files:**
- Create: `src/marey-chart/TrainLine.tsx`
- Create: `src/marey-chart/TrainLine.test.tsx`
- Create: `src/marey-chart/TrainLayer.tsx`
- Create: `src/marey-chart/TrainLayer.test.tsx`
- Modify: `src/marey-chart/MareyChart.tsx` — render `TrainLayer`

**Interfaces:**
- Consumes: `Train`, `TrainPoint` from `./types`; `xForStation`, `yScale` from context
- Produces: `<TrainLine train={Train} />` — draws one `<path>` via a D3-owned ref, skipping points whose `place` is not in `xForStation` and interpolating straight between the surrounding known points.
- Produces: `<TrainLayer trains={Train[]} />` — renders one `<TrainLine>` per train.

- [ ] **Step 1: Write the failing test for `TrainLine`**

```tsx
// src/marey-chart/TrainLine.test.tsx
import { render } from '@testing-library/react';
import { scaleTime } from 'd3-scale';
import { describe, expect, it } from 'vitest';
import { TrainLine } from './TrainLine';
import { MareyChartProvider } from './MareyChartContext';
import type { Train } from './types';

const yScale = scaleTime()
  .domain([new Date('2026-01-01T12:00:00Z'), new Date('2026-01-01T13:00:00Z')])
  .range([0, 600]);

const xForStation = new Map([
  ['a', 0],
  ['b', 100],
  ['c', 200],
]);

describe('TrainLine', () => {
  it('draws a path point for every stop at a known station', () => {
    const train: Train = {
      id: 't1',
      points: [
        { time: new Date('2026-01-01T12:00:00Z'), place: 'a' },
        { time: new Date('2026-01-01T12:30:00Z'), place: 'b' },
      ],
    };

    const { container } = render(
      <MareyChartProvider value={{ xForStation, yScale }}>
        <svg>
          <TrainLine train={train} />
        </svg>
      </MareyChartProvider>
    );

    const path = container.querySelector('[data-testid="train-line"]');
    expect(path).not.toBeNull();
    expect(path?.getAttribute('d')).toContain('M0,0');
  });

  it('skips stops at unknown places, interpolating between known points', () => {
    const train: Train = {
      id: 't2',
      points: [
        { time: new Date('2026-01-01T12:00:00Z'), place: 'a' },
        { time: new Date('2026-01-01T12:15:00Z'), place: 'unknown-passthrough' },
        { time: new Date('2026-01-01T12:30:00Z'), place: 'b' },
      ],
    };

    const { container } = render(
      <MareyChartProvider value={{ xForStation, yScale }}>
        <svg>
          <TrainLine train={train} />
        </svg>
      </MareyChartProvider>
    );

    const path = container.querySelector('[data-testid="train-line"]');
    // Only two known points -> a single "L" segment, not three.
    expect(path?.getAttribute('d')?.match(/L/g)?.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- TrainLine`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `TrainLine`**

Follows the note's decision: React mounts the `<path>` once, D3 updates its `d` attribute imperatively via a ref whenever `train` or the scales change — this isolates each train's high-frequency updates from its siblings.

```tsx
// src/marey-chart/TrainLine.tsx
import { useEffect, useRef } from 'react';
import { select } from 'd3-selection';
import { line as d3Line } from 'd3-shape';
import { useMareyChartScales } from './MareyChartContext';
import type { Train } from './types';

export function TrainLine({ train }: { train: Train }) {
  const pathRef = useRef<SVGPathElement>(null);
  const { xForStation, yScale } = useMareyChartScales();

  useEffect(() => {
    const knownPoints = train.points
      .filter((point) => xForStation.has(point.place))
      .map((point) => [xForStation.get(point.place)!, yScale(point.time)] as [number, number]);

    const path = d3Line()(knownPoints) ?? '';
    select(pathRef.current).attr('d', path);
  }, [train, xForStation, yScale]);

  return <path ref={pathRef} data-testid="train-line" fill="none" stroke="currentColor" />;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- TrainLine`
Expected: PASS

- [ ] **Step 5: Write the failing test for `TrainLayer`**

```tsx
// src/marey-chart/TrainLayer.test.tsx
import { render } from '@testing-library/react';
import { scaleTime } from 'd3-scale';
import { describe, expect, it } from 'vitest';
import { TrainLayer } from './TrainLayer';
import { MareyChartProvider } from './MareyChartContext';
import type { Train } from './types';

const yScale = scaleTime().domain([new Date(), new Date(Date.now() + 3600_000)]).range([0, 600]);
const xForStation = new Map([['a', 0]]);

describe('TrainLayer', () => {
  it('renders one TrainLine per train', () => {
    const trains: Train[] = [
      { id: 't1', points: [{ time: new Date(), place: 'a' }] },
      { id: 't2', points: [{ time: new Date(), place: 'a' }] },
    ];

    const { getAllByTestId } = render(
      <MareyChartProvider value={{ xForStation, yScale }}>
        <svg>
          <TrainLayer trains={trains} />
        </svg>
      </MareyChartProvider>
    );

    expect(getAllByTestId('train-line').length).toBe(2);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- TrainLayer`
Expected: FAIL — module does not exist.

- [ ] **Step 7: Implement `TrainLayer`**

```tsx
// src/marey-chart/TrainLayer.tsx
import { TrainLine } from './TrainLine';
import type { Train } from './types';

export function TrainLayer({ trains }: { trains: Train[] }) {
  return (
    <g data-testid="train-layer">
      {trains.map((train) => (
        <TrainLine key={train.id} train={train} />
      ))}
    </g>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- TrainLayer`
Expected: PASS

- [ ] **Step 9: Wire `TrainLayer` into `MareyChart`**

```tsx
<MareyChartProvider value={scales}>
  <GridLines width={size.width} />
  <XAxis stations={stations} />
  <YAxis width={size.width} />
  <TrainLayer trains={trains} />
</MareyChartProvider>
```

- [ ] **Step 10: Visually verify**

Run `npm run dev` with a couple of mock trains stopping at the mock stations. Confirm diagonal lines connect the correct station/time positions.

- [ ] **Step 11: Commit**

```bash
git add src/marey-chart/TrainLine.tsx src/marey-chart/TrainLine.test.tsx src/marey-chart/TrainLayer.tsx src/marey-chart/TrainLayer.test.tsx src/marey-chart/MareyChart.tsx
git commit -m "feat: render trains as D3-updated polylines"
```

---

### Task 6: Y-axis zoom and pan

**Files:**
- Create: `src/marey-chart/clampYDomain.ts`
- Create: `src/marey-chart/clampYDomain.test.ts`
- Modify: `src/marey-chart/useMareyScales.ts` — replace the static y-domain with interactive state bound to `d3-zoom`
- Modify: `src/marey-chart/YAxis.tsx` — bind the zoom behavior to the axis surface, add a reset control
- Modify: `src/marey-chart/MareyChartContext.tsx` — extend scales with `isFollowingNow` and `resetToNow`

**Interfaces:**
- Consumes: `MareyChartConfig['yAxis']` bounds
- Produces:
  - `clampYDomain(rawDomain: [Date, Date], now: Date, yConfig: MareyChartConfig['yAxis']): [Date, Date]` — clamps a candidate domain so its start is never before `now - panBackLimitMs`, its end never after `now + panForwardLimitMs`, and its duration stays within `[zoomMinDurationMs, zoomMaxDurationMs]`.
  - `useMareyScales(...)` now also returns `isFollowingNow: boolean` and `resetToNow: () => void`.

- [ ] **Step 1: Write the failing tests for `clampYDomain`**

```ts
// src/marey-chart/clampYDomain.test.ts
import { describe, expect, it } from 'vitest';
import { clampYDomain } from './clampYDomain';
import { defaultConfig } from './config';

const now = new Date('2026-01-01T12:00:00Z');
const yConfig = defaultConfig.yAxis;

describe('clampYDomain', () => {
  it('leaves a domain within bounds untouched', () => {
    const domain: [Date, Date] = [
      new Date(now.getTime() - 10 * 60_000),
      new Date(now.getTime() + 50 * 60_000),
    ];
    const [start, end] = clampYDomain(domain, now, yConfig);
    expect(start).toEqual(domain[0]);
    expect(end).toEqual(domain[1]);
  });

  it('never allows the start before now - panBackLimitMs', () => {
    const domain: [Date, Date] = [
      new Date(now.getTime() - 60 * 60_000),
      new Date(now.getTime() + 30 * 60_000),
    ];
    const [start] = clampYDomain(domain, now, yConfig);
    expect(start.getTime()).toBe(now.getTime() - yConfig.panBackLimitMs);
  });

  it('never allows the end after now + panForwardLimitMs', () => {
    const domain: [Date, Date] = [
      new Date(now.getTime()),
      new Date(now.getTime() + 24 * 60 * 60_000),
    ];
    const [, end] = clampYDomain(domain, now, yConfig);
    expect(end.getTime()).toBe(now.getTime() + yConfig.panForwardLimitMs);
  });

  it('never allows a visible duration shorter than zoomMinDurationMs', () => {
    const domain: [Date, Date] = [now, new Date(now.getTime() + 5 * 60_000)];
    const [start, end] = clampYDomain(domain, now, yConfig);
    expect(end.getTime() - start.getTime()).toBe(yConfig.zoomMinDurationMs);
  });

  it('never allows a visible duration longer than zoomMaxDurationMs', () => {
    const domain: [Date, Date] = [now, new Date(now.getTime() + 10 * 60 * 60_000)];
    const [start, end] = clampYDomain(domain, now, yConfig);
    expect(end.getTime() - start.getTime()).toBe(yConfig.zoomMaxDurationMs);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- clampYDomain`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `clampYDomain`**

Duration is clamped first (around the domain's own midpoint, so zooming doesn't silently pan), then the result is shifted to respect the absolute pan bounds.

```ts
// src/marey-chart/clampYDomain.ts
import type { MareyChartConfig } from './types';

export function clampYDomain(
  rawDomain: [Date, Date],
  now: Date,
  yConfig: MareyChartConfig['yAxis']
): [Date, Date] {
  const rawStart = rawDomain[0].getTime();
  const rawEnd = rawDomain[1].getTime();
  const midpoint = (rawStart + rawEnd) / 2;

  const duration = Math.min(
    Math.max(rawEnd - rawStart, yConfig.zoomMinDurationMs),
    yConfig.zoomMaxDurationMs
  );

  let start = midpoint - duration / 2;
  let end = midpoint + duration / 2;

  const earliestAllowed = now.getTime() - yConfig.panBackLimitMs;
  const latestAllowed = now.getTime() + yConfig.panForwardLimitMs;

  if (start < earliestAllowed) {
    start = earliestAllowed;
    end = start + duration;
  }
  if (end > latestAllowed) {
    end = latestAllowed;
    start = end - duration;
  }

  return [new Date(start), new Date(end)];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- clampYDomain`
Expected: PASS

- [ ] **Step 5: Extend `useMareyScales` with interactive y-domain state**

```ts
// src/marey-chart/useMareyScales.ts (y-related portion, replacing Task 4's static version)
import { useCallback, useMemo, useState } from 'react';
import { createDefaultYDomain, createYScale } from './yScale';
import { clampYDomain } from './clampYDomain';
// ...existing x-axis imports unchanged

export function useMareyScales(stations: Station[], config: MareyChartConfig, dims: ChartDims) {
  const xForStation = useMemo(/* unchanged from Task 3 */ () => {
    const blended = computeBlendedPositions(stations, config.xAxis.blendWeight);
    const pixels = applyPixelConstraints(
      blended,
      dims.width,
      config.xAxis.minStationPixelGap,
      config.xAxis.maxSegmentShare
    );
    return new Map(stations.map((station, i) => [station.id, pixels[i]]));
  }, [stations, config.xAxis.blendWeight, config.xAxis.minStationPixelGap, config.xAxis.maxSegmentShare, dims.width]);

  const [yDomain, setYDomainState] = useState<[Date, Date]>(() =>
    createDefaultYDomain(new Date(), config.yAxis)
  );
  const [isFollowingNow, setIsFollowingNow] = useState(true);

  const setYDomain = useCallback(
    (candidate: [Date, Date], causedByUserGesture: boolean) => {
      const clamped = clampYDomain(candidate, new Date(), config.yAxis);
      setYDomainState(clamped);
      if (causedByUserGesture) setIsFollowingNow(false);
    },
    [config.yAxis]
  );

  const resetToNow = useCallback(() => {
    setIsFollowingNow(true);
    setYDomainState(createDefaultYDomain(new Date(), config.yAxis));
  }, [config.yAxis]);

  const yScale = useMemo(() => createYScale(yDomain, dims.height), [yDomain, dims.height]);

  return { xForStation, yScale, yDomain, setYDomain, isFollowingNow, resetToNow };
}
```

Update `MareyChartScales` in `MareyChartContext.tsx` to include the new fields (`yDomain`, `setYDomain`, `isFollowingNow`, `resetToNow`), matching this return shape exactly.

- [ ] **Step 6: Write the failing test for zoom/pan wiring in `YAxis`**

Testing real `d3-zoom` gesture recognition in jsdom is unreliable (see spec's testing strategy — we trust d3 for gesture recognition and only test what happens after a transform arrives). This test drives the y-axis's exposed zoom handler directly.

```tsx
// src/marey-chart/YAxis.test.tsx (add to existing file)
import { fireEvent } from '@testing-library/react';

it('calls setYDomain with causedByUserGesture=true on user wheel input, and renders a reset control', () => {
  const yScale = scaleTime()
    .domain([new Date('2026-01-01T12:00:00Z'), new Date('2026-01-01T12:20:00Z')])
    .range([0, 200]);
  const setYDomain = vi.fn();
  const resetToNow = vi.fn();

  const { getByTestId, getByRole } = render(
    <MareyChartProvider
      value={{
        xForStation: new Map(),
        yScale,
        yDomain: yScale.domain() as [Date, Date],
        setYDomain,
        isFollowingNow: true,
        resetToNow,
      }}
    >
      <svg>
        <YAxis width={400} />
      </svg>
    </MareyChartProvider>
  );

  fireEvent.wheel(getByTestId('y-axis-zoom-surface'), { deltaY: -10 });
  expect(setYDomain).toHaveBeenCalled();
  expect(setYDomain.mock.calls[0][1]).toBe(true);

  fireEvent.click(getByRole('button', { name: /återställ/i }));
  expect(resetToNow).toHaveBeenCalled();
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npm test -- YAxis`
Expected: FAIL — no zoom surface or reset button yet.

- [ ] **Step 8: Implement zoom binding and reset control in `YAxis`**

Only `transform.k` and `transform.y` are used; `transform.x` is ignored, keeping the interaction one-dimensional as decided in the spec.

```tsx
// src/marey-chart/YAxis.tsx
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
    if (!surface) return;

    const baseDomain = yDomain;
    const baseDurationMs = baseDomain[1].getTime() - baseDomain[0].getTime();
    const baseMidpointMs = (baseDomain[0].getTime() + baseDomain[1].getTime()) / 2;

    const behavior = d3Zoom<SVGRectElement, unknown>().on(
      'zoom',
      (event: D3ZoomEvent<SVGRectElement, unknown>) => {
        const { k, y } = event.transform;
        const newDurationMs = baseDurationMs / k;
        const centerMs = baseMidpointMs - (y / (yScale.range()[1] || 1)) * baseDurationMs;
        const candidate: [Date, Date] = [
          new Date(centerMs - newDurationMs / 2),
          new Date(centerMs + newDurationMs / 2),
        ];
        setYDomain(candidate, event.sourceEvent != null);
      }
    );

    select(surface).call(behavior);
    return () => {
      select(surface).on('.zoom', null);
    };
  }, [yDomain, yScale, setYDomain]);

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
        <text key={`left-${tick.getTime()}`} data-testid="y-label-left" x={0} y={yScale(tick)}>
          {formatTime(tick)}
        </text>
      ))}
      {ticks.map((tick) => (
        <text key={`right-${tick.getTime()}`} data-testid="y-label-right" x={width} y={yScale(tick)}>
          {formatTime(tick)}
        </text>
      ))}
      <foreignObject x={width / 2 - 40} y={0} width={80} height={24}>
        <button type="button" onClick={resetToNow}>
          Återställ
        </button>
      </foreignObject>
    </g>
  );
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npm test -- YAxis`
Expected: PASS

- [ ] **Step 10: Wire the new context fields through `MareyChart`**

`scales` from `useMareyScales` already includes `yDomain`, `setYDomain`, `isFollowingNow`, `resetToNow` after Step 5 — no further change needed in `MareyChart.tsx` beyond what Task 4 already wired, since `MareyChartProvider value={scales}` passes the whole object through.

- [ ] **Step 11: Visually verify**

Run `npm run dev`. Scroll/wheel over the chart and confirm the visible time window zooms and pans within the -15min/+12h bounds, and clicking "Återställ" snaps back to the default -15/+60 window.

- [ ] **Step 12: Commit**

```bash
git add src/marey-chart/clampYDomain.ts src/marey-chart/clampYDomain.test.ts src/marey-chart/useMareyScales.ts src/marey-chart/YAxis.tsx src/marey-chart/YAxis.test.tsx src/marey-chart/MareyChartContext.tsx
git commit -m "feat: add y-axis zoom/pan with bounded domain and follow-now tracking"
```

---

### Task 7: Live "now" line

**Files:**
- Create: `src/marey-chart/NowLine.tsx`
- Create: `src/marey-chart/NowLine.test.tsx`
- Modify: `src/marey-chart/MareyChart.tsx` — render `NowLine`
- Modify: `src/marey-chart/config.ts` — no change needed (colors already present); confirm `colors.nowLine` used here

**Interfaces:**
- Consumes: `yScale` from context, `config.yAxis.colors.nowLine`, `nowTickIntervalMs` (a prop, default 1000ms, so tests can control cadence without touching global config)
- Produces: `<NowLine tickIntervalMs?: number />` — a `<line>` whose `y1`/`y2` are updated on an interval via a ref, without causing the y-scale or gridlines to re-render.

- [ ] **Step 1: Write the failing test for `NowLine`**

```tsx
// src/marey-chart/NowLine.test.tsx
import { render } from '@testing-library/react';
import { scaleTime } from 'd3-scale';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NowLine } from './NowLine';
import { MareyChartProvider } from './MareyChartContext';

describe('NowLine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('moves its position on each tick without needing a re-render from the parent', () => {
    const start = new Date('2026-01-01T12:00:00Z');
    vi.setSystemTime(start);

    const yScale = scaleTime()
      .domain([start, new Date(start.getTime() + 60 * 60_000)])
      .range([0, 600]);

    const { container } = render(
      <MareyChartProvider
        value={{
          xForStation: new Map(),
          yScale,
          yDomain: yScale.domain() as [Date, Date],
          setYDomain: () => {},
          isFollowingNow: true,
          resetToNow: () => {},
        }}
      >
        <svg>
          <NowLine width={800} tickIntervalMs={1000} />
        </svg>
      </MareyChartProvider>
    );

    const line = container.querySelector('[data-testid="now-line"]');
    const initialY = line?.getAttribute('y1');

    vi.setSystemTime(new Date(start.getTime() + 5 * 60_000));
    vi.advanceTimersByTime(1000);

    expect(line?.getAttribute('y1')).not.toBe(initialY);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- NowLine`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `NowLine`**

```tsx
// src/marey-chart/NowLine.tsx
import { useEffect, useRef } from 'react';
import { select } from 'd3-selection';
import { useMareyChartScales } from './MareyChartContext';
import { defaultConfig } from './config';

export function NowLine({
  width,
  tickIntervalMs = 1000,
  color = defaultConfig.yAxis.colors.nowLine,
}: {
  width: number;
  tickIntervalMs?: number;
  color?: string;
}) {
  const lineRef = useRef<SVGLineElement>(null);
  const { yScale } = useMareyChartScales();

  useEffect(() => {
    const update = () => {
      const y = yScale(new Date());
      select(lineRef.current).attr('y1', y).attr('y2', y);
    };

    update();
    const intervalId = setInterval(update, tickIntervalMs);
    return () => clearInterval(intervalId);
  }, [yScale, tickIntervalMs]);

  return (
    <line ref={lineRef} data-testid="now-line" x1={0} x2={width} y1={0} y2={0} stroke={color} strokeWidth={2} />
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- NowLine`
Expected: PASS

- [ ] **Step 5: Wire `NowLine` into `MareyChart`**

```tsx
<MareyChartProvider value={scales}>
  <GridLines width={size.width} />
  <XAxis stations={stations} />
  <YAxis width={size.width} />
  <TrainLayer trains={trains} />
  <NowLine width={size.width} color={config.yAxis.colors.nowLine} />
</MareyChartProvider>
```

- [ ] **Step 6: Visually verify**

Run `npm run dev`. Confirm a colored line sits at the current time and visibly creeps down the chart second by second without the rest of the chart flickering or re-rendering.

- [ ] **Step 7: Commit**

```bash
git add src/marey-chart/NowLine.tsx src/marey-chart/NowLine.test.tsx src/marey-chart/MareyChart.tsx
git commit -m "feat: add live now-line decoupled from scale recalculation"
```

---

### Task 8: Mechanical domain refresh while following now

**Files:**
- Modify: `src/marey-chart/useMareyScales.ts` — add an interval that re-derives the default domain while `isFollowingNow` is true
- Create: `src/marey-chart/useMareyScales.followNow.test.ts`

**Interfaces:**
- Consumes: `config.yAxis.mechanicalRefreshIntervalMs`, `isFollowingNow`
- Produces: no new public API — `yDomain` (and therefore `yScale`) advances automatically at `mechanicalRefreshIntervalMs` cadence whenever `isFollowingNow` is true, and stops advancing the moment the user pans/zooms (from Task 6).

- [ ] **Step 1: Write the failing test**

```ts
// src/marey-chart/useMareyScales.followNow.test.ts
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMareyScales } from './useMareyScales';
import { defaultConfig } from './config';

describe('useMareyScales — mechanical refresh while following now', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('advances the y-domain forward on the configured interval while following now', () => {
    const start = new Date('2026-01-01T12:00:00Z');
    vi.setSystemTime(start);

    const config = {
      ...defaultConfig,
      yAxis: { ...defaultConfig.yAxis, mechanicalRefreshIntervalMs: 1000 },
    };

    const { result } = renderHook(() => useMareyScales([], config, { width: 100, height: 100 }));
    const initialDomain = result.current.yDomain;

    vi.setSystemTime(new Date(start.getTime() + 5 * 60_000));
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.yDomain[0].getTime()).toBeGreaterThan(initialDomain[0].getTime());
    expect(result.current.isFollowingNow).toBe(true);
  });

  it('stops advancing once the user has interacted (isFollowingNow is false)', () => {
    const start = new Date('2026-01-01T12:00:00Z');
    vi.setSystemTime(start);

    const config = {
      ...defaultConfig,
      yAxis: { ...defaultConfig.yAxis, mechanicalRefreshIntervalMs: 1000 },
    };

    const { result } = renderHook(() => useMareyScales([], config, { width: 100, height: 100 }));

    act(() => {
      result.current.setYDomain(
        [new Date(start.getTime() - 5 * 60_000), new Date(start.getTime() + 20 * 60_000)],
        true
      );
    });
    const domainAfterUserPan = result.current.yDomain;

    vi.setSystemTime(new Date(start.getTime() + 5 * 60_000));
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.yDomain).toEqual(domainAfterUserPan);
    expect(result.current.isFollowingNow).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useMareyScales.followNow`
Expected: FAIL — no mechanical refresh implemented yet; domain stays static.

- [ ] **Step 3: Implement the mechanical refresh**

```ts
// src/marey-chart/useMareyScales.ts (add alongside existing state from Task 6)
import { useCallback, useEffect, useMemo, useState } from 'react';
// ...existing imports

export function useMareyScales(stations: Station[], config: MareyChartConfig, dims: ChartDims) {
  // ...xForStation unchanged...

  const [yDomain, setYDomainState] = useState<[Date, Date]>(() =>
    createDefaultYDomain(new Date(), config.yAxis)
  );
  const [isFollowingNow, setIsFollowingNow] = useState(true);

  const setYDomain = useCallback(
    (candidate: [Date, Date], causedByUserGesture: boolean) => {
      const clamped = clampYDomain(candidate, new Date(), config.yAxis);
      setYDomainState(clamped);
      if (causedByUserGesture) setIsFollowingNow(false);
    },
    [config.yAxis]
  );

  const resetToNow = useCallback(() => {
    setIsFollowingNow(true);
    setYDomainState(createDefaultYDomain(new Date(), config.yAxis));
  }, [config.yAxis]);

  useEffect(() => {
    if (!isFollowingNow) return;
    const intervalId = setInterval(() => {
      setYDomainState(createDefaultYDomain(new Date(), config.yAxis));
    }, config.yAxis.mechanicalRefreshIntervalMs);
    return () => clearInterval(intervalId);
  }, [isFollowingNow, config.yAxis]);

  const yScale = useMemo(() => createYScale(yDomain, dims.height), [yDomain, dims.height]);

  return { xForStation, yScale, yDomain, setYDomain, isFollowingNow, resetToNow };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- useMareyScales.followNow`
Expected: PASS (both tests)

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: All tests across all tasks PASS.

- [ ] **Step 6: Visually verify**

Run `npm run dev`. Leave the chart untouched and confirm the visible window (not just the now-line) creeps forward every `mechanicalRefreshIntervalMs`. Pan/zoom, confirm it freezes; click "Återställ", confirm it resumes following.

- [ ] **Step 7: Commit**

```bash
git add src/marey-chart/useMareyScales.ts src/marey-chart/useMareyScales.followNow.test.ts
git commit -m "feat: mechanically advance y-domain while following now"
```

---

## Deferred (explicitly out of scope for this plan)

Per the spec's "Öppna frågor": exact tick/label density at extreme zoom levels (currently using d3's default `scale.ticks()`), a concrete SVG→Canvas performance escalation threshold, and fine-tuning `mechanicalRefreshIntervalMs`. These are intentionally left as follow-up work once the component is running against real data, not implemented speculatively here.
