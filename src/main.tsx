import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MareyChart } from './marey-chart/MareyChart';
import type { Station, Train } from './marey-chart/types';

const mockStations: Station[] = [
  { id: 'a', name: 'Alpha', distanceKm: 0 },
  { id: 'b', name: 'Beta', distanceKm: 10 },
  { id: 'c', name: 'Gamma', distanceKm: 200 },
  { id: 'd', name: 'Delta', distanceKm: 15 },
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div
      style={{
        height: '100vh',
        width: '100vw',
        boxSizing: 'border-box',
        padding: 24,
        background: '#f3f4f6',
      }}
    >
      <div style={{ width: '100%', height: '100%', border: '1px solid #9ca3af', boxSizing: 'border-box' }}>
        <MareyChart stations={mockStations} trains={mockTrains} />
      </div>
    </div>
  </StrictMode>
);
