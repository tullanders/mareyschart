import { createContext, useContext, type ReactNode } from 'react';

export type MareyChartScales = {
  xForStation: Map<string, number>;
  yScale: import('d3-scale').ScaleTime<number, number>;
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
