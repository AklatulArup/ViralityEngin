import baselineData from "@/data/baseline.json";
import type { BaselineData, EnrichedVideo } from "./types";

export const GLOBAL_BASELINE: BaselineData = baselineData.global;

export function isOutlier(views: number, median: number): boolean {
  return views >= median * 3;
}

export function vsBaseline(views: number, median: number): number {
  if (median === 0) return 0;
  return parseFloat((views / median).toFixed(1));
}

export function classifyPerformance(
  views: number,
  velocity: number,
  medianViews: number,
  medianVelocity: number
): "outlier" | "strong" | "average" | "underperformer" {
  if (views >= medianViews * 3 || velocity >= medianVelocity * 3) {
    return "outlier";
  }
  if (views >= medianViews && velocity >= medianVelocity) {
    return "strong";
  }
  if (views >= medianViews || velocity >= medianVelocity) {
    return "average";
  }
  return "underperformer";
}

export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function detectTrend(
  videos: EnrichedVideo[]
): "growing" | "stable" | "declining" {
  if (videos.length < 4) return "stable";

  // Compare first half avg views to second half (chronological order)
  const sorted = [...videos].sort(
    (a, b) =>
      new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
  );

  const mid = Math.floor(sorted.length / 2);
  const olderAvg =
    sorted.slice(0, mid).reduce((s, v) => s + v.views, 0) / mid;
  const newerAvg =
    sorted.slice(mid).reduce((s, v) => s + v.views, 0) /
    (sorted.length - mid);

  const ratio = newerAvg / (olderAvg || 1);
  if (ratio > 1.2) return "growing";
  if (ratio < 0.8) return "declining";
  return "stable";
}

export function calculateUploadFrequency(videos: EnrichedVideo[]): number {
  if (videos.length < 2) return 0;
  const sorted = [...videos].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
  const gaps: number[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const diff =
      new Date(sorted[i].publishedAt).getTime() -
      new Date(sorted[i + 1].publishedAt).getTime();
    gaps.push(diff / 86_400_000);
  }
  return Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length);
}
