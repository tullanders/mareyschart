# Grenvyer (Branch Views) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let `MareyChart` render 1-6 standalone Marey chart panels side by side (a main view plus up to 5 branch views), each with its own stations/trains/x-axis, all sharing a single y-axis time domain with synced pan/zoom.

**Architecture:** Split the existing combined `useMareyScales` hook into `useYScale` (one shared instance per chart, owns the time domain/zoom/pan/follow-now state) and `useXForStation` (one instance per panel, pure station-position math). A new `ChartPanel` component renders one panel's `GridLines`/`XAxis`/`YAxis`/`TrainLayer`/`NowLine` wired to a `MareyChartProvider` that mixes the shared y-scale with the panel's own x-positions. `MareyChart` becomes a thin orchestrator: measure the container, compute per-panel widths with a new pure `computePanelLayout` function (weighted by station count), and render one `ChartPanel` per entry in a new `panels` prop.

**Tech Stack:** React 18, TypeScript, d3 (d3-scale, d3-selection, d3-zoom, d3-shape), Vitest + @testing-library/react, ESLint, Vite.

**Spec:** [docs/superpowers/specs/2026-09-11-branch-views-design.md](../specs/2026-09-11-branch-views-design.md) — read it alongside this plan; the plan implements every decision in it and does not restate the rationale.

## Global Constraints

- `MareyChart`'s `stations`/`trains` props are replaced entirely by `panels: MareyChartPanel[]` — no backwards-compatible dual API.
- `panels[0]` is the main view, `panels[1..]` are branches — purely positional, no `isMain` flag anywhere.
- `MareyChartConfig` keeps its current shape and is shared by all panels unchanged (no per-panel config in this iteration).
- Panel gap and left/right label margins reuse existing constants: `Y_AXIS_LABEL_MARGIN = 64`, `X_AXIS_LABEL_MARGIN = 28`. The gap between panels equals `X_AXIS_LABEL_MARGIN` (28px).
- Panel width is proportional to `panel.stations.length` (`computePanelLayout`), splitting evenly only when every panel has zero stations.
- Y-axis labels: left labels only on `panels[0]`, right labels only on the last panel (both true when there is exactly one panel — unchanged single-panel behavior).
- Reset-to-now button: only rendered on `panels[0]`.
- Tangent detection / deciding which branches exist is **out of scope** — the caller supplies finished `panels`.
- `npm test`, `npm run lint`, and `npm run build` must all pass before the final commit.

---

### Task 1: `computePanelLayout` — proportional panel widths

**Files:**
- Create: `src/marey-chart/panelLayout.ts`
- Test: `src/marey-chart/panelLayout.test.ts`

**Interfaces:**
- Produces: `type PanelLayout = { width: number; x: number }` and `function computePanelLayout(stationCounts: number[], totalWidth: number, gap: number): PanelLayout[]` — consumed by Task 6 (`MareyChart.tsx`).

- [ ] **Step 1: Write the failing test**

```ts
// src/marey-chart/panelLayout.test.ts
import { describe, expect, it } from 'vitest';
import { computePanelLayout } from './panelLayout';

describe('computePanelLayout', () => {
  it('gives a single panel the full width, with no gap applied', () => {
    const layouts = computePanelLayout([4], 1000, 28);
    expect(layouts).toEqual([{ width: 1000, x: 0 }]);
  });

  it('splits width between panels proportionally to station count, after subtracting the gap', () => {
    const layouts = computePanelLayout([3, 1], 828, 28);
    expect(layouts[0].width).toBeCloseTo(600);
    expect(layouts[0].x).toBeCloseTo(0);
    expect(layouts[1].width).toBeCloseTo(200);
    expect(layouts[1].x).toBeCloseTo(628);
  });

  it('splits width evenly when every panel has zero stations', () => {
    const layouts = computePanelLayout([0, 0], 800, 0);
    expect(layouts[0]).toEqual({ width: 400, x: 0 });
    expect(layouts[1]).toEqual({ width: 400, x: 400 });
  });

  it('returns an empty array for zero panels', () => {
    expect(computePanelLayout([], 1000, 28)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/marey-chart/panelLayout.test.ts`
Expected: FAIL with "Cannot find module './panelLayout'" (or similar resolution error).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/marey-chart/panelLayout.ts
export type PanelLayout = { width: number; x: number };

export function computePanelLayout(
  stationCounts: number[],
  totalWidth: number,
  gap: number
): PanelLayout[] {
  const n = stationCounts.length;
  if (n === 0) return [];
  if (n === 1) return [{ width: totalWidth, x: 0 }];

  const availableWidth = Math.max(totalWidth - gap * (n - 1), 0);
  const totalStations = stationCounts.reduce((sum, count) => sum + count, 0);
  const weights =
    totalStations === 0
      ? stationCounts.map(() => 1 / n)
      : stationCounts.map((count) => count / totalStations);

  const layouts: PanelLayout[] = [];
  let x = 0;
  for (let i = 0; i < n; i++) {
    const width = availableWidth * weights[i];
    layouts.push({ width, x });
    x += width + gap;
  }
  return layouts;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/marey-chart/panelLayout.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/marey-chart/panelLayout.ts src/marey-chart/panelLayout.test.ts
git commit -m "$(cat <<'EOF'
feat: add computePanelLayout for proportional multi-panel widths

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `useYScale` — shared time-domain hook

**Files:**
- Create: `src/marey-chart/useYScale.ts`
- Test: `src/marey-chart/useYScale.test.ts`

**Interfaces:**
- Consumes: `createDefaultYDomain`, `createYScale` from `./yScale` (unchanged), `clampYDomain` from `./clampYDomain` (unchanged), `MareyChartConfig` from `./types` (unchanged).
- Produces: `function useYScale(config: MareyChartConfig['yAxis'], height: number): { yScale: ScaleTime<number, number>; yDomain: [Date, Date]; setYDomain: (candidate: [Date, Date], causedByUserGesture: boolean) => void; isFollowingNow: boolean; resetToNow: () => void }` — consumed by Task 6 (`MareyChart.tsx`) and by the `YAxis.test.tsx` harness update in Task 6.

This duplicates logic currently in `useMareyScales.ts`; that file is deleted in Task 6 once nothing depends on it anymore. Leave it untouched here.

- [ ] **Step 1: Write the failing test**

```ts
// src/marey-chart/useYScale.test.ts
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useYScale } from './useYScale';
import { defaultConfig } from './config';

describe('useYScale — mechanical refresh while following now', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('advances the y-domain forward on the configured interval while following now', () => {
    const start = new Date('2026-01-01T12:00:00Z');
    vi.setSystemTime(start);

    const yConfig = { ...defaultConfig.yAxis, mechanicalRefreshIntervalMs: 1000 };

    const { result } = renderHook(() => useYScale(yConfig, 100));
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

    const yConfig = { ...defaultConfig.yAxis, mechanicalRefreshIntervalMs: 1000 };

    const { result } = renderHook(() => useYScale(yConfig, 100));

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

Run: `npx vitest run src/marey-chart/useYScale.test.ts`
Expected: FAIL with "Cannot find module './useYScale'"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/marey-chart/useYScale.ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createDefaultYDomain, createYScale } from './yScale';
import { clampYDomain } from './clampYDomain';
import type { MareyChartConfig } from './types';

export function useYScale(config: MareyChartConfig['yAxis'], height: number) {
  const [yDomain, setYDomainState] = useState<[Date, Date]>(() =>
    createDefaultYDomain(new Date(), config)
  );
  const [isFollowingNow, setIsFollowingNow] = useState(true);

  const setYDomain = useCallback(
    (candidate: [Date, Date], causedByUserGesture: boolean) => {
      const clamped = clampYDomain(candidate, new Date(), config);
      setYDomainState(clamped);
      if (causedByUserGesture) setIsFollowingNow(false);
    },
    [config]
  );

  const resetToNow = useCallback(() => {
    setIsFollowingNow(true);
    setYDomainState(createDefaultYDomain(new Date(), config));
  }, [config]);

  useEffect(() => {
    if (!isFollowingNow) return;
    const intervalId = setInterval(() => {
      setYDomainState(createDefaultYDomain(new Date(), config));
    }, config.mechanicalRefreshIntervalMs);
    return () => clearInterval(intervalId);
  }, [isFollowingNow, config]);

  const yScale = useMemo(() => createYScale(yDomain, height), [yDomain, height]);

  return { yScale, yDomain, setYDomain, isFollowingNow, resetToNow };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/marey-chart/useYScale.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/marey-chart/useYScale.ts src/marey-chart/useYScale.test.ts
git commit -m "$(cat <<'EOF'
feat: extract useYScale hook for a shared time domain

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `useXForStation` — per-panel x-position hook

**Files:**
- Create: `src/marey-chart/useXForStation.ts`
- Test: `src/marey-chart/useXForStation.test.ts`

**Interfaces:**
- Consumes: `computeBlendedPositions`, `applyPixelConstraints` from `./xAxisPositioning` (unchanged).
- Produces: `function useXForStation(stations: Station[], config: MareyChartConfig['xAxis'], width: number): Map<string, number>` — consumed by Task 5 (`ChartPanel.tsx`).

- [ ] **Step 1: Write the failing test**

```ts
// src/marey-chart/useXForStation.test.ts
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useXForStation } from './useXForStation';
import { defaultConfig } from './config';
import type { Station } from './types';

const stations: Station[] = [
  { id: 'a', name: 'A', distanceKm: 0 },
  { id: 'b', name: 'B', distanceKm: 50 },
  { id: 'c', name: 'C', distanceKm: 100 },
];

describe('useXForStation', () => {
  it('memoizes x positions on stations, config and width, not on unrelated re-renders', () => {
    const { result, rerender } = renderHook(
      ({ s, c, w }) => useXForStation(s, c, w),
      { initialProps: { s: stations, c: defaultConfig.xAxis, w: 1000 } }
    );

    const firstMap = result.current;
    expect(firstMap.get('a')).toBeCloseTo(0);
    expect(firstMap.get('c')).toBeCloseTo(1000);

    rerender({ s: stations, c: defaultConfig.xAxis, w: 1000 });
    expect(result.current).toBe(firstMap); // same reference: memoized
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/marey-chart/useXForStation.test.ts`
Expected: FAIL with "Cannot find module './useXForStation'"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/marey-chart/useXForStation.ts
import { useMemo } from 'react';
import { applyPixelConstraints, computeBlendedPositions } from './xAxisPositioning';
import type { MareyChartConfig, Station } from './types';

export function useXForStation(
  stations: Station[],
  config: MareyChartConfig['xAxis'],
  width: number
): Map<string, number> {
  return useMemo(() => {
    const blended = computeBlendedPositions(stations, config.blendWeight);
    const pixels = applyPixelConstraints(
      blended,
      width,
      config.minStationPixelGap,
      config.maxSegmentShare
    );
    return new Map(stations.map((station, i) => [station.id, pixels[i]]));
  }, [stations, config.blendWeight, config.minStationPixelGap, config.maxSegmentShare, width]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/marey-chart/useXForStation.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/marey-chart/useXForStation.ts src/marey-chart/useXForStation.test.ts
git commit -m "$(cat <<'EOF'
feat: extract useXForStation hook for per-panel station positions

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `YAxis` — label and reset-button visibility props

**Files:**
- Modify: `src/marey-chart/YAxis.tsx`
- Modify: `src/marey-chart/YAxis.test.tsx`

**Interfaces:**
- Produces: `YAxis` gains `showLeftLabels?: boolean`, `showRightLabels?: boolean`, `showResetButton?: boolean` props, all defaulting to `true` — consumed by Task 5 (`ChartPanel.tsx`).
- All three existing tests in `YAxis.test.tsx` must keep passing unmodified (they don't pass the new props, so defaults apply and behavior is identical to today).

- [ ] **Step 1: Write the failing test**

Add this test to the end of the `describe('YAxis', ...)` block in `src/marey-chart/YAxis.test.tsx` (keep all existing tests as-is):

```tsx
  it('hides left/right labels and the reset button when the corresponding show* props are false', () => {
    const yScale = scaleTime()
      .domain([new Date('2026-01-01T12:00:00Z'), new Date('2026-01-01T12:20:00Z')])
      .range([0, 200]);
    const resetToNow = vi.fn();

    const { queryAllByTestId, queryByRole } = render(
      <MareyChartProvider
        value={{
          xForStation: new Map(),
          yScale,
          yDomain: yScale.domain() as [Date, Date],
          setYDomain: vi.fn(),
          isFollowingNow: true,
          resetToNow,
        }}
      >
        <svg>
          <YAxis
            width={400}
            height={200}
            showLeftLabels={false}
            showRightLabels={false}
            showResetButton={false}
          />
        </svg>
      </MareyChartProvider>
    );

    expect(queryAllByTestId('y-label-left').length).toBe(0);
    expect(queryAllByTestId('y-label-right').length).toBe(0);
    expect(queryByRole('button', { name: /återställ/i })).toBeNull();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/marey-chart/YAxis.test.tsx`
Expected: FAIL — TypeScript error, `YAxis` does not accept `showLeftLabels`/`showRightLabels`/`showResetButton` props (or, if TS errors are non-fatal in the test runner, a runtime failure because labels/button still render).

- [ ] **Step 3: Write minimal implementation**

In `src/marey-chart/YAxis.tsx`, change the function signature:

```tsx
export function YAxis({
  width,
  height,
  showLeftLabels = true,
  showRightLabels = true,
  showResetButton = true,
}: {
  width: number;
  height: number;
  showLeftLabels?: boolean;
  showRightLabels?: boolean;
  showResetButton?: boolean;
}) {
```

Then wrap the three conditionally-rendered blocks (left labels, right labels, reset button):

```tsx
      {showLeftLabels &&
        ticks.map((tick) => (
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
      {showRightLabels &&
        ticks.map((tick) => (
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
      {showResetButton && resetToNow && (
        <foreignObject x={width / 2 - 40} y={0} width={80} height={24}>
          <button type="button" onClick={resetToNow}>
            Återställ
          </button>
        </foreignObject>
      )}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/marey-chart/YAxis.test.tsx`
Expected: PASS (4 tests — the 3 existing plus the new one)

- [ ] **Step 5: Commit**

```bash
git add src/marey-chart/YAxis.tsx src/marey-chart/YAxis.test.tsx
git commit -m "$(cat <<'EOF'
feat: add label/reset-button visibility props to YAxis

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `ChartPanel` — single standalone panel

**Files:**
- Create: `src/marey-chart/ChartPanel.tsx`
- Test: `src/marey-chart/ChartPanel.test.tsx`

**Interfaces:**
- Consumes: `useXForStation` (Task 3), `YAxis` with new props (Task 4), `MareyChartProvider` from `./MareyChartContext` (unchanged), `GridLines`, `XAxis`, `TrainLayer`, `NowLine` (all unchanged), `Station`/`Train`/`MareyChartConfig` from `./types`.
- Produces:
  ```ts
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
  export function ChartPanel(props: ChartPanelProps): JSX.Element;
  ```
  Consumed by Task 6 (`MareyChart.tsx`).

- [ ] **Step 1: Write the failing test**

```tsx
// src/marey-chart/ChartPanel.test.tsx
import { render } from '@testing-library/react';
import { scaleTime } from 'd3-scale';
import { describe, expect, it, vi } from 'vitest';
import { ChartPanel, type ChartPanelProps } from './ChartPanel';
import { defaultConfig } from './config';
import type { Station, Train } from './types';

const stations: Station[] = [
  { id: 'a', name: 'A', distanceKm: 0 },
  { id: 'b', name: 'B', distanceKm: 10 },
];
const trains: Train[] = [];

function renderPanel(overrides: Partial<ChartPanelProps> = {}) {
  const yScale = scaleTime()
    .domain([new Date('2026-01-01T12:00:00Z'), new Date('2026-01-01T12:20:00Z')])
    .range([0, 200]);

  const props: ChartPanelProps = {
    stations,
    trains,
    width: 400,
    height: 200,
    config: defaultConfig,
    yScale,
    yDomain: yScale.domain() as [Date, Date],
    setYDomain: vi.fn(),
    isFollowingNow: true,
    resetToNow: vi.fn(),
    showLeftLabels: true,
    showRightLabels: true,
    showResetButton: true,
    ...overrides,
  };

  return render(
    <svg>
      <ChartPanel {...props} />
    </svg>
  );
}

describe('ChartPanel', () => {
  it('renders gridlines, x-axis, y-axis, trains and the now-line', () => {
    const { getByTestId } = renderPanel();
    expect(getByTestId('gridlines')).toBeTruthy();
    expect(getByTestId('x-axis')).toBeTruthy();
    expect(getByTestId('y-axis')).toBeTruthy();
    expect(getByTestId('train-layer')).toBeTruthy();
    expect(getByTestId('now-line')).toBeTruthy();
  });

  it('forwards label/reset-button visibility down to YAxis', () => {
    const { queryAllByTestId, queryByRole } = renderPanel({
      showLeftLabels: false,
      showRightLabels: false,
      showResetButton: false,
    });
    expect(queryAllByTestId('y-label-left').length).toBe(0);
    expect(queryAllByTestId('y-label-right').length).toBe(0);
    expect(queryByRole('button', { name: /återställ/i })).toBeNull();
  });

  it('places stations using its own width via useXForStation', () => {
    const { getAllByTestId } = renderPanel({ width: 400 });
    const gridlines = getAllByTestId('x-gridline');
    expect(gridlines[0].getAttribute('x1')).toBe('0');
    expect(gridlines[gridlines.length - 1].getAttribute('x1')).toBe('400');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/marey-chart/ChartPanel.test.tsx`
Expected: FAIL with "Cannot find module './ChartPanel'"

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/marey-chart/ChartPanel.tsx
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/marey-chart/ChartPanel.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/marey-chart/ChartPanel.tsx src/marey-chart/ChartPanel.test.tsx
git commit -m "$(cat <<'EOF'
feat: add ChartPanel for rendering a single standalone panel

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: `MareyChart` — panels API, orchestration, cleanup

**Files:**
- Modify: `src/marey-chart/types.ts`
- Modify: `src/marey-chart/MareyChart.tsx`
- Modify: `src/marey-chart/MareyChart.test.tsx`
- Modify: `src/marey-chart/index.ts`
- Modify: `src/marey-chart/YAxis.test.tsx`
- Delete: `src/marey-chart/useMareyScales.ts`
- Delete: `src/marey-chart/useMareyScales.test.ts`
- Delete: `src/marey-chart/useMareyScales.followNow.test.ts`

**Interfaces:**
- Consumes: `useYScale` (Task 2), `computePanelLayout`/`PanelLayout` (Task 1), `ChartPanel` (Task 5), `useContainerSize` (unchanged).
- Produces: `export type MareyChartPanel = { id: string; stations: Station[]; trains: Train[] }` (in `types.ts`), `export type MareyChartProps = { panels: MareyChartPanel[]; config?: MareyChartConfig }` (in `MareyChart.tsx`, re-exported from `index.ts`) — consumed by Task 7 (`main.tsx`).

- [ ] **Step 1: Add `MareyChartPanel` to `types.ts`**

In `src/marey-chart/types.ts`, add this type after the `Train` type (after line 16, before `MareyChartConfig`):

```ts
export type MareyChartPanel = {
  id: string;
  stations: Station[];
  trains: Train[];
};
```

- [ ] **Step 2: Write the failing test (rewrite `MareyChart.test.tsx`)**

Replace the full contents of `src/marey-chart/MareyChart.test.tsx`:

```tsx
import { act, render, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MareyChart } from './MareyChart';
import type { Station } from './types';

let resizeCallback: ResizeObserverCallback = () => {};

class MockResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    resizeCallback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

function resize(width: number, height: number) {
  act(() => {
    resizeCallback(
      [{ contentRect: { width, height } } as ResizeObserverEntry],
      {} as ResizeObserver
    );
  });
}

const stationsA: Station[] = [
  { id: 'a', name: 'A', distanceKm: 0 },
  { id: 'b', name: 'B', distanceKm: 10 },
  { id: 'c', name: 'C', distanceKm: 20 },
];
const stationsB: Station[] = [{ id: 'd', name: 'D', distanceKm: 0 }];

describe('MareyChart', () => {
  it('renders an svg matching the wrapper size', () => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    const { getByTestId } = render(
      <MareyChart panels={[{ id: 'main', stations: [], trains: [] }]} />
    );

    resize(500, 400);

    const svg = getByTestId('marey-chart-svg');
    expect(svg.getAttribute('width')).toBe('500');
    expect(svg.getAttribute('height')).toBe('400');
  });

  it('shows labels on both sides and the reset button when there is a single panel', () => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    const { getByTestId } = render(
      <MareyChart panels={[{ id: 'main', stations: stationsA, trains: [] }]} />
    );
    resize(500, 400);

    const panel = within(getByTestId('chart-panel-main'));
    expect(panel.getAllByTestId('y-label-left').length).toBeGreaterThan(0);
    expect(panel.getAllByTestId('y-label-right').length).toBeGreaterThan(0);
    expect(panel.getByRole('button', { name: /återställ/i })).toBeTruthy();
  });

  it('shows left labels + reset button only on the first panel, right labels only on the last', () => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    const { getByTestId } = render(
      <MareyChart
        panels={[
          { id: 'main', stations: stationsA, trains: [] },
          { id: 'branch', stations: stationsB, trains: [] },
        ]}
      />
    );
    resize(900, 400);

    const main = within(getByTestId('chart-panel-main'));
    const branch = within(getByTestId('chart-panel-branch'));

    expect(main.getAllByTestId('y-label-left').length).toBeGreaterThan(0);
    expect(main.queryAllByTestId('y-label-right').length).toBe(0);
    expect(main.getByRole('button', { name: /återställ/i })).toBeTruthy();

    expect(branch.queryAllByTestId('y-label-left').length).toBe(0);
    expect(branch.getAllByTestId('y-label-right').length).toBeGreaterThan(0);
    expect(branch.queryByRole('button', { name: /återställ/i })).toBeNull();
  });

  it('gives panels width proportional to their station count', () => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    const { getByTestId } = render(
      <MareyChart
        panels={[
          { id: 'main', stations: stationsA, trains: [] }, // 3 stations
          { id: 'branch', stations: stationsB, trains: [] }, // 1 station
        ]}
      />
    );
    // plotWidth = 900 - 64*2 = 772; available = 772 - 28 = 744
    // weights 3/4, 1/4 -> main width 558, branch x = 558 + 28 = 586
    resize(900, 400);

    const branchGroup = getByTestId('chart-panel-branch');
    const transform = branchGroup.getAttribute('transform') ?? '';
    const match = transform.match(/translate\(([-\d.]+),/);
    const branchX = match ? Number(match[1]) : NaN;

    expect(branchX).toBeCloseTo(586, 5);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/marey-chart/MareyChart.test.tsx`
Expected: FAIL — `MareyChart` doesn't accept a `panels` prop yet (TypeScript error) and/or `chart-panel-*` testids don't exist.

- [ ] **Step 4: Rewrite `MareyChart.tsx`**

Replace the full contents of `src/marey-chart/MareyChart.tsx`:

```tsx
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
```

- [ ] **Step 5: Update `index.ts`**

In `src/marey-chart/index.ts`, change the type export line:

```ts
export type { Station, TrainPoint, Train, MareyChartPanel, MareyChartConfig } from './types';
```

- [ ] **Step 6: Update the `YAxis.test.tsx` harness to stop using `useMareyScales`**

In `src/marey-chart/YAxis.test.tsx`, replace the import:

```ts
import { useMareyScales } from './useMareyScales';
```

with:

```ts
import { useYScale } from './useYScale';
```

And replace the `Harness` function body:

```tsx
function Harness({ onDomain }: { onDomain: (d: [Date, Date]) => void }) {
  const scales = useMareyScales([], defaultConfig, { width: 400, height: 200 });
  onDomain(scales.yDomain);
  return (
    <svg>
      <MareyChartProvider value={scales}>
        <YAxis width={400} height={200} />
      </MareyChartProvider>
    </svg>
  );
}
```

with:

```tsx
function Harness({ onDomain }: { onDomain: (d: [Date, Date]) => void }) {
  const scales = useYScale(defaultConfig.yAxis, 200);
  onDomain(scales.yDomain);
  return (
    <svg>
      <MareyChartProvider value={{ xForStation: new Map(), ...scales }}>
        <YAxis width={400} height={200} />
      </MareyChartProvider>
    </svg>
  );
}
```

- [ ] **Step 7: Delete the old combined hook and its tests**

```bash
git rm src/marey-chart/useMareyScales.ts src/marey-chart/useMareyScales.test.ts src/marey-chart/useMareyScales.followNow.test.ts
```

- [ ] **Step 8: Run the full test suite and typecheck**

Run: `npm test`
Expected: PASS, all test files green (including `MareyChart.test.tsx` and `YAxis.test.tsx`).

Run: `npm run build`
Expected: succeeds (this runs `tsc -b`, catching any leftover references to the deleted hook or old props).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: render MareyChart as a row of standalone panels

Replaces the single stations/trains API with a panels prop: 1-6
standalone chart panels (main view + branch views) laid out side by
side, sharing one y-axis time domain with synced pan/zoom, each with
proportional width based on its own station count.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Migrate `main.tsx` and visually verify

**Files:**
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `MareyChart` with the new `panels` prop (Task 6).

- [ ] **Step 1: Update the mock data and render call in `main.tsx`**

In `src/main.tsx`, add a second mock dataset for a branch view. After the existing `mockTrains` array (after line 34), add:

```ts
const mockBranchStations: Station[] = [
  { id: 'd', name: 'Delta', distanceKm: 200 },
  { id: 'e', name: 'Epsilon', distanceKm: 260 },
];

const mockBranchTrains: Train[] = [
  {
    id: 't3',
    points: [
      { time: new Date(now.getTime() + 45 * 60_000), place: 'd' },
      { time: new Date(now.getTime() + 70 * 60_000), place: 'e' },
    ],
  },
];
```

- [ ] **Step 2: Update the `MareyChart` render call**

Replace:

```tsx
        <MareyChart stations={mockStations} trains={mockTrains} config={config} />
```

with:

```tsx
        <MareyChart
          panels={[
            { id: 'main', stations: mockStations, trains: mockTrains },
            { id: 'branch', stations: mockBranchStations, trains: mockBranchTrains },
          ]}
          config={config}
        />
```

- [ ] **Step 3: Run the full test suite, lint, and build**

Run: `npm test && npm run lint && npm run build`
Expected: all three succeed.

- [ ] **Step 4: Visually verify with a real screenshot**

`npm run build` success proves compilation only, not layout — take an actual screenshot before claiming the branch panel renders correctly (per this repo's established verification approach for layout/spacing changes).

```bash
npx playwright install chromium
npx vite --port 5183 &>/tmp/vite-dev.log & disown
for i in $(seq 1 20); do curl -s http://localhost:5183/ >/dev/null && break; sleep 0.5; done
npx playwright screenshot --viewport-size=1100,500 --wait-for-selector='[data-testid="marey-chart-svg"]' http://localhost:5183/ /tmp/branch-views.png
```

Read `/tmp/branch-views.png` and confirm:
- Two panels are visible side by side, separated by a visible gap.
- The main panel (3 stations) is visibly wider than the branch panel (2 stations).
- Time labels appear on the far left of the main panel and the far right of the branch panel, but not in the middle (between the two panels).
- The "Återställ" button appears only over the main panel.
- No label text is clipped at any edge.

If anything looks wrong, fix it in the relevant file from Tasks 4-6 and re-screenshot before proceeding.

```bash
pkill -f "vite --port 5183"
```

- [ ] **Step 5: Commit**

```bash
git add src/main.tsx
git commit -m "$(cat <<'EOF'
feat: add a branch-view example to the dev sandbox

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
