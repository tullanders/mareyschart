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
