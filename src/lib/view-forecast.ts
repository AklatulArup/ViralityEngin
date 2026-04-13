/**
 * View count forecaster — empirical decay curves per platform.
 * Given current views + publish date + platform + a target date,
 * returns predicted views as { low, mid, high }.
 */

export type ForecastPlatform = "youtube" | "youtube_short" | "tiktok" | "instagram";

export interface ViewForecast {
  low: number;
  mid: number;
  high: number;
  daysToTarget: number;
  daysSincePublish: number;
  confidence: "low" | "medium" | "high";
  platformLabel: string;
}

/**
 * Cumulative share of total lifetime views by day N.
 * Values derived from empirical cross-creator analysis.
 */
function cumulativeShare(day: number, platform: ForecastPlatform): number {
  if (day <= 0) return 0.001;

  if (platform === "tiktok") {
    // Hard decay — 95% of views in first 7 days, caps at day 30
    if (day >= 30) return 1.0;
    if (day <= 1) return 0.38;
    if (day <= 3) return 0.62;
    if (day <= 7) return 0.82;
    if (day <= 14) return 0.93;
    return 0.93 + (day - 14) / (30 - 14) * 0.07;
  }

  if (platform === "instagram") {
    // Similar to TikTok, slightly slower
    if (day >= 21) return 1.0;
    if (day <= 1) return 0.33;
    if (day <= 3) return 0.57;
    if (day <= 7) return 0.77;
    if (day <= 14) return 0.92;
    return 0.92 + (day - 14) / 7 * 0.08;
  }

  if (platform === "youtube_short") {
    // Shorts: spike then long tail, but much slower than TikTok
    if (day >= 180) return 1.0;
    if (day <= 1) return 0.28;
    if (day <= 3) return 0.48;
    if (day <= 7) return 0.64;
    if (day <= 14) return 0.74;
    if (day <= 30) return 0.83;
    if (day <= 60) return 0.91;
    if (day <= 90) return 0.96;
    return 0.96 + (day - 90) / 90 * 0.04;
  }

  // youtube (long-form) — evergreen, log-based slow decay
  if (day >= 365) return 1.0;
  if (day <= 1) return 0.08;
  if (day <= 3) return 0.16;
  if (day <= 7) return 0.28;
  if (day <= 14) return 0.40;
  if (day <= 30) return 0.55;
  if (day <= 60) return 0.68;
  if (day <= 90) return 0.78;
  if (day <= 180) return 0.90;
  return 0.90 + (day - 180) / 185 * 0.10;
}

export function forecastViews(
  currentViews: number,
  publishedAt: string,
  platform: ForecastPlatform,
  targetDate: Date
): ViewForecast {
  const now = new Date();
  const published = new Date(publishedAt);
  const daysSince = Math.max(1, Math.floor((now.getTime() - published.getTime()) / 86400000));
  const daysToTarget = Math.floor((targetDate.getTime() - published.getTime()) / 86400000);

  const platformLabel: Record<ForecastPlatform, string> = {
    youtube: "YouTube long-form",
    youtube_short: "YouTube Shorts",
    tiktok: "TikTok",
    instagram: "Instagram",
  };

  // If target is in the past or same as now, just return current views
  if (daysToTarget <= daysSince) {
    return {
      low: Math.round(currentViews * 0.85),
      mid: currentViews,
      high: Math.round(currentViews * 1.15),
      daysToTarget,
      daysSincePublish: daysSince,
      confidence: "high",
      platformLabel: platformLabel[platform],
    };
  }

  const shareCurrent = cumulativeShare(daysSince, platform);
  const shareTarget = cumulativeShare(daysToTarget, platform);

  // Estimated total lifetime views
  const estimatedTotal = currentViews / shareCurrent;
  const midViews = Math.round(estimatedTotal * shareTarget);

  // Uncertainty grows with how far out we're projecting
  const projectionRatio = daysToTarget / daysSince;
  const spreadFactor = Math.min(0.65, 0.15 + projectionRatio * 0.08);

  const low = Math.round(midViews * (1 - spreadFactor));
  const high = Math.round(midViews * (1 + spreadFactor * 1.4));

  // Confidence based on video age (more data = more confidence)
  const confidence: "low" | "medium" | "high" =
    daysSince < 3 ? "low" : daysSince < 10 ? "medium" : "high";

  return {
    low,
    mid: midViews,
    high,
    daysToTarget,
    daysSincePublish: daysSince,
    confidence,
    platformLabel: platformLabel[platform],
  };
}

export function detectPlatform(
  video: { platform?: string; duration?: string }
): ForecastPlatform {
  if (video.platform === "tiktok") return "tiktok";
  // YouTube Shorts: duration ≤ 60s or vertical
  if (video.duration) {
    const parts = video.duration.split(":").map(Number);
    const seconds = parts.length === 3
      ? parts[0] * 3600 + parts[1] * 60 + parts[2]
      : parts.length === 2
        ? parts[0] * 60 + parts[1]
        : parts[0];
    if (seconds <= 60) return "youtube_short";
  }
  return "youtube";
}
