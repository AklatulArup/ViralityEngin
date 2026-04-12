import type { ReferenceEntry, PublishTimeHeatmap } from "./types";

export function computePublishTimeHeatmap(entries: ReferenceEntry[]): PublishTimeHeatmap {
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // 7 days × 24 hours — each cell stores { totalViews, count }
  const grid: { total: number; count: number }[][] = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => ({ total: 0, count: 0 }))
  );

  let analyzed = 0;

  for (const entry of entries) {
    if (!entry.analyzedAt || !entry.metrics.views) continue;
    const date = new Date(entry.analyzedAt);
    if (isNaN(date.getTime())) continue;

    const day = date.getUTCDay();
    const hour = date.getUTCHours();
    grid[day][hour].total += entry.metrics.views;
    grid[day][hour].count += 1;
    analyzed++;
  }

  // Build average grid
  const dayHourGrid: number[][] = grid.map((row) =>
    row.map((cell) => (cell.count > 0 ? Math.round(cell.total / cell.count) : 0))
  );

  // Find best and worst slots (min 2 videos)
  const slots: { day: number; hour: number; avgViews: number; videoCount: number }[] = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      if (grid[d][h].count >= 2) {
        slots.push({
          day: d,
          hour: h,
          avgViews: dayHourGrid[d][h],
          videoCount: grid[d][h].count,
        });
      }
    }
  }

  slots.sort((a, b) => b.avgViews - a.avgViews);
  const bestSlots = slots.slice(0, 5);
  const worstSlots = slots.length > 5
    ? [...slots].sort((a, b) => a.avgViews - b.avgViews).slice(0, 5)
    : [];

  return { dayHourGrid, bestSlots, worstSlots, totalVideosAnalyzed: analyzed, dayLabels };
}
