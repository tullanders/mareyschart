import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MareyChart } from './marey-chart/MareyChart';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div style={{ height: '100vh' }}>
      <MareyChart stations={[]} trains={[]} />
    </div>
  </StrictMode>
);
