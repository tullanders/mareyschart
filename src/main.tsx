import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MareyChart } from './marey-chart/MareyChart';
import { defaultConfig } from './marey-chart/config';
import type { Station, Train } from './marey-chart/types';

const mockStations: Station[] = [
  { id: 'a', name: 'Alpha', distanceKm: 0 },
  { id: 'b', name: 'Beta', distanceKm: 10 },
  { id: 'c', name: 'Gamma', distanceKm: 100 },
  { id: 'd', name: 'Delta', distanceKm: 200 },
];

const now = new Date();
const mockTrains: Train[] = [
  {
    id: 't1',
    points: [
      { time: new Date(now.getTime() - 10 * 60_000), place: 'a' },
      { time: new Date(now.getTime() + 5 * 60_000), place: 'b' },
      { time: new Date(now.getTime() + 20 * 60_000), place: 'c' },
      { time: new Date(now.getTime() + 45 * 60_000), place: 'd' },
    ],
  },
  {
    id: 't2',
    points: [
      { time: new Date(now.getTime() + 50 * 60_000), place: 'd' },
      { time: new Date(now.getTime() + 30 * 60_000), place: 'c' },
      { time: new Date(now.getTime() + 15 * 60_000), place: 'b' },
      { time: new Date(now.getTime()), place: 'a' },
    ],
  },
];

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

/** Dev-only slider so x-axis blend/constraint knobs can be tweaked without editing code. */
function XAxisControls({
  blendWeight,
  onBlendWeightChange,
  minStationPixelGap,
  onMinStationPixelGapChange,
  maxSegmentShare,
  onMaxSegmentShareChange,
}: {
  blendWeight: number;
  onBlendWeightChange: (value: number) => void;
  minStationPixelGap: number;
  onMinStationPixelGapChange: (value: number) => void;
  maxSegmentShare: number;
  onMaxSegmentShareChange: (value: number) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 24,
        alignItems: 'center',
        flexWrap: 'wrap',
        padding: '8px 12px',
        marginBottom: 12,
        background: '#fff',
        border: '1px solid #d1d5db',
        borderRadius: 4,
        fontSize: 13,
        fontFamily: 'sans-serif',
      }}
    >
      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        blendWeight: {blendWeight.toFixed(2)}
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={blendWeight}
          onChange={(e) => onBlendWeightChange(Number(e.target.value))}
        />
      </label>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        minStationPixelGap: {minStationPixelGap}
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={minStationPixelGap}
          onChange={(e) => onMinStationPixelGapChange(Number(e.target.value))}
        />
      </label>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        maxSegmentShare: {maxSegmentShare.toFixed(2)}
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.01}
          value={maxSegmentShare}
          onChange={(e) => onMaxSegmentShareChange(Number(e.target.value))}
        />
      </label>
    </div>
  );
}

function App() {
  const [blendWeight, setBlendWeight] = useState(defaultConfig.xAxis.blendWeight);
  const [minStationPixelGap, setMinStationPixelGap] = useState(
    defaultConfig.xAxis.minStationPixelGap
  );
  const [maxSegmentShare, setMaxSegmentShare] = useState(defaultConfig.xAxis.maxSegmentShare);

  const config = useMemo(
    () => ({
      ...defaultConfig,
      xAxis: { blendWeight, minStationPixelGap, maxSegmentShare },
    }),
    [blendWeight, minStationPixelGap, maxSegmentShare]
  );

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        boxSizing: 'border-box',
        padding: 24,
        background: '#f3f4f6',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <XAxisControls
        blendWeight={blendWeight}
        onBlendWeightChange={setBlendWeight}
        minStationPixelGap={minStationPixelGap}
        onMinStationPixelGapChange={setMinStationPixelGap}
        maxSegmentShare={maxSegmentShare}
        onMaxSegmentShareChange={setMaxSegmentShare}
      />
      <div
        style={{ flex: 1, minHeight: 0, border: '1px solid #9ca3af', boxSizing: 'border-box' }}
      >
        <MareyChart
          panels={[
            { id: 'main', stations: mockStations, trains: mockTrains },
            { id: 'branch', stations: mockBranchStations, trains: mockBranchTrains },
          ]}
          config={config}
        />
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
