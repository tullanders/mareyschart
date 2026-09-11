import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MareyChart } from './marey-chart/MareyChart';
import type { Station } from './marey-chart/types';

const mockStations: Station[] = [
  { id: 'a', name: 'Alpha', distanceKm: 0 },
  { id: 'b', name: 'Beta', distanceKm: 10 },
  { id: 'c', name: 'Gamma', distanceKm: 15 },
  { id: 'd', name: 'Delta', distanceKm: 100 },
];

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div style={{ height: '100vh' }}>
      <MareyChart stations={mockStations} trains={[]} />
    </div>
  </StrictMode>
);
