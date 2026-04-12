import type { ReferenceEntry, TagPerformance, TagCorrelationResult } from "./types";

export function computeTagCorrelation(entries: ReferenceEntry[]): TagCorrelationResult {
  const validEntries = entries.filter((e) => e.tags && e.tags.length > 0 && e.metrics.views != null);

  if (validEntries.length < 3) {
    return { topTags: [], bottomTags: [], outlierTags: [], totalTagsAnalyzed: 0, totalVideosAnalyzed: 0 };
  }

  // Overall stats
  const allViews = validEntries.map((e) => e.metrics.views!).sort((a, b) => a - b);
  const overallMedian = allViews[Math.floor(allViews.length / 2)];
  const overallAvg = allViews.reduce((s, v) => s + v, 0) / allViews.length;
  const outlierThreshold = overallMedian * 3;

  // Collect tag stats
  const tagMap = new Map<string, { views: number[]; engagement: number[]; vrs: number[] }>();

  for (const e of validEntries) {
    for (const tag of e.tags!) {
      const lower = tag.toLowerCase().trim();
      if (lower.length < 2) continue;
      const existing = tagMap.get(lower) || { views: [], engagement: [], vrs: [] };
      existing.views.push(e.metrics.views!);
      if (e.metrics.engagement != null) existing.engagement.push(e.metrics.engagement);
      if (e.metrics.vrsScore != null) existing.vrs.push(e.metrics.vrsScore);
      tagMap.set(lower, existing);
    }
  }

  // Build tag performances (min 2 videos)
  const performances: TagPerformance[] = [];

  for (const [tag, data] of tagMap) {
    if (data.views.length < 2) continue;

    const sorted = [...data.views].sort((a, b) => a - b);
    const avgViews = Math.round(data.views.reduce((s, v) => s + v, 0) / data.views.length);
    const medianViews = sorted[Math.floor(sorted.length / 2)];
    const outliers = data.views.filter((v) => v > outlierThreshold).length;
    const outlierRate = Math.round((outliers / data.views.length) * 100);
    const avgVRS = data.vrs.length > 0
      ? Math.round(data.vrs.reduce((s, v) => s + v, 0) / data.vrs.length)
      : 0;

    // Correlation: how much this tag's avg deviates from overall
    const correlation = Math.max(-1, Math.min(1, (avgViews - overallAvg) / (overallAvg || 1)));

    performances.push({
      tag,
      videoCount: data.views.length,
      avgViews,
      medianViews,
      outlierRate,
      avgVRS,
      correlation: Math.round(correlation * 100) / 100,
    });
  }

  // Sort for different lists
  const byViewsDesc = [...performances].sort((a, b) => b.avgViews - a.avgViews);
  const byViewsAsc = [...performances].sort((a, b) => a.avgViews - b.avgViews);
  const byOutlier = [...performances]
    .filter((p) => p.outlierRate > 0)
    .sort((a, b) => b.outlierRate - a.outlierRate);

  return {
    topTags: byViewsDesc.slice(0, 15),
    bottomTags: byViewsAsc.slice(0, 10),
    outlierTags: byOutlier.slice(0, 10),
    totalTagsAnalyzed: performances.length,
    totalVideosAnalyzed: validEntries.length,
  };
}
