import type {
  VideoData,
  VRSResult,
  VRSCriterionResult,
  VRSTierSummary,
  VRSTier,
  CriterionStatus,
  VRSCriterion,
} from "./types";
import { YT_LONGFORM_CRITERIA } from "./vrs-criteria";
import { TT_CRITERIA } from "./trs-criteria";

const TIER_LABELS: Record<VRSTier, string> = {
  1: "CRITICAL",
  2: "STRONG",
  3: "SUPPORT",
  4: "BASELINE",
};

// ─── New Channel Boost ───
// YouTube's algorithm tests new creators aggressively via Browse/Suggested.
// A channel with <5 videos gets algorithmic discovery boost, but has no organic base.
// Net effect: slight upward adjustment to hidden score estimation.

function getNewChannelFactor(video: VideoData): number {
  const ctx = video.channelContext;
  if (!ctx) return 0;

  const { videoCount, subs, channelAgeDays } = ctx;

  // Brand new channel: <5 videos, <1000 subs
  if (videoCount <= 5 && subs < 1000) {
    // YouTube gives new channels a "testing boost" in Browse
    // But they have no organic audience — net is slight positive
    if (channelAgeDays < 90) return 0.08; // Very new — moderate discovery boost
    return 0.04; // Somewhat new
  }

  // Small but established channel: growing
  if (videoCount <= 20 && subs < 5000) {
    return 0.02; // Slight boost for emerging creators
  }

  return 0;
}

// ─── Hidden Score Estimation ───
// Uses engagement velocity and performance signals as proxies for hidden criteria.
// Hidden criteria (thumbnail, mobile thumb, visual promise, audio quality) require
// visual/audio analysis that cannot be done from metadata alone.

function estimateHiddenScore(
  video: VideoData,
  earned: number,
  possible: number,
  hiddenWeight: number
): number {
  if (hiddenWeight <= 0) return 0;

  const likeRatio = video.views > 0 ? (video.likes / video.views) * 100 : 0;
  const commentRatio =
    video.views > 0 ? (video.comments / video.views) * 100 : 0;

  // Score 0-1 for each proxy signal
  const likeFactor = Math.min(likeRatio / 5, 1);
  const commentFactor = Math.min(commentRatio / 3, 1);

  // Duration factor: videos 8-25 min tend to have better production quality
  const durMin = video.durationSeconds / 60;
  const durationFactor =
    durMin >= 8 && durMin <= 25
      ? 0.7
      : durMin >= 3 && durMin <= 45
        ? 0.5
        : 0.3;

  // Title/thumbnail proxy: power words, numbers, and question marks signal strong packaging
  const title = video.title.toLowerCase();
  const hasNumber = /\d/.test(title);
  const hasPowerWord =
    /secret|revealed|shocking|insane|truth|proven|ultimate|never|always|how to|why/i.test(title);
  const hasQuestion = /\?/.test(title);
  const packagingFactor =
    (hasNumber ? 0.25 : 0) +
    (hasPowerWord ? 0.25 : 0) +
    (hasQuestion ? 0.2 : 0) +
    0.15;

  // Assessed score quality
  const assessedRatio = possible > 0 ? earned / possible : 0;

  // New channel boost
  const newChannelBoost = getNewChannelFactor(video);

  // Weighted combination of proxy signals
  const hiddenMultiplier =
    likeFactor * 0.3 +
    commentFactor * 0.2 +
    durationFactor * 0.15 +
    packagingFactor * 0.15 +
    assessedRatio * 0.2 +
    newChannelBoost;

  // Clamp between 0.15 and 0.75
  const clampedMultiplier = Math.max(0.15, Math.min(0.75, hiddenMultiplier));

  return hiddenWeight * clampedMultiplier;
}

export function runVRS(
  video: VideoData,
  criteria: VRSCriterion[] = YT_LONGFORM_CRITERIA
): VRSResult {
  const results: VRSCriterionResult[] = [];
  let earned = 0;
  let possible = 0;
  let hiddenCount = 0;
  let hiddenWeight = 0;

  for (const c of criteria) {
    const score = c.check(video);
    const rationaleText = c.rationale(video, score);

    if (score === null) {
      hiddenCount++;
      hiddenWeight += c.weight;
      results.push({
        id: c.id,
        label: c.label,
        weight: c.weight,
        tier: c.tier,
        status: "hidden",
        points: 0,
        maxPoints: c.weight,
        rationale: rationaleText,
      });
    } else {
      const points = c.weight * score;
      earned += points;
      possible += c.weight;

      let status: CriterionStatus;
      if (score >= 1) status = "pass";
      else if (score >= 0.5) status = "partial";
      else status = "fail";

      results.push({
        id: c.id,
        label: c.label,
        weight: c.weight,
        tier: c.tier,
        status,
        points,
        maxPoints: c.weight,
        rationale: rationaleText,
      });
    }
  }

  // Build tier summaries
  const tiers: VRSTier[] = [1, 2, 3, 4];
  const tierSummaries: VRSTierSummary[] = tiers.map((tier) => {
    const tierCriteria = results.filter((c) => c.tier === tier);
    const assessed = tierCriteria.filter((c) => c.status !== "hidden");
    return {
      tier,
      label: TIER_LABELS[tier],
      earned: assessed.reduce((sum, c) => sum + c.points, 0),
      possible: assessed.reduce((sum, c) => sum + c.maxPoints, 0),
      assessed: assessed.length,
      total: tierCriteria.length,
    };
  });

  // Gap analysis
  const gaps = results
    .filter((c) => c.status === "fail" || c.status === "partial")
    .sort((a, b) => b.weight - a.weight);

  const topFixes = gaps.slice(0, 3);

  const totalWeight = criteria.reduce((s, c) => s + c.weight, 0);
  const score = possible > 0 ? Math.round((earned / possible) * 100) : 0;

  // Estimate hidden criteria contribution
  const estimatedHidden = estimateHiddenScore(
    video,
    earned,
    possible,
    hiddenWeight
  );
  const estimatedFullScore =
    totalWeight > 0
      ? Math.round(((earned + estimatedHidden) / totalWeight) * 100)
      : 0;

  return {
    score,
    estimatedFullScore,
    earned,
    possible,
    totalWeight,
    estimatedHiddenScore: Math.round(estimatedHidden * 10) / 10,
    tierSummaries,
    criteria: results,
    gaps,
    topFixes,
    hiddenCount,
  };
}

export function runTRS(video: VideoData): VRSResult {
  return runVRS(video, TT_CRITERIA);
}

export function getVRSColor(score: number): string {
  if (score >= 90) return "var(--color-vrs-excellent)";
  if (score >= 75) return "var(--color-vrs-strong)";
  if (score >= 60) return "var(--color-vrs-competitive)";
  if (score >= 40) return "var(--color-vrs-needs-work)";
  return "var(--color-vrs-rework)";
}

export function getVRSLabel(score: number): string {
  if (score >= 90) return "Viral-ready";
  if (score >= 75) return "Strong performer";
  if (score >= 60) return "Competitive";
  if (score >= 40) return "Needs work";
  return "Fundamental rework";
}

export function getVRSExplanation(score: number, assessedCount: number, totalCriteria: number, referenceCount: number): string {
  const label = getVRSLabel(score);
  const tierDesc = score >= 90
    ? "This video has strong signals across nearly all measurable criteria. It demonstrates the engagement patterns, packaging quality, and content structure that YouTube's algorithm actively promotes."
    : score >= 75
      ? "This video shows strong viral signals but has room for improvement in specific areas. The core metrics are solid — focus on the gap analysis below to identify the highest-impact improvements."
      : score >= 60
        ? "This video is competitive but not yet optimized for maximum algorithmic distribution. Several key signals are underperforming — the gap analysis shows exactly where to focus."
        : score >= 40
          ? "This video has significant gaps in viral readiness. Key signals like engagement, retention proxies, or packaging need attention before the algorithm will actively distribute it."
          : "This video needs fundamental improvements across multiple criteria before it can compete for algorithmic distribution. Focus on the top 3 fixes below.";

  return `VRS ${score}% — "${label}"\n\n${tierDesc}\n\nScored across ${assessedCount} of ${totalCriteria} criteria using live YouTube API data, engagement proxies, and content analysis. ${referenceCount > 0 ? `Compared against ${referenceCount} videos/channels in the reference pool.` : "Add more videos to the reference pool for comparative accuracy."}`;
}

export function getTierColor(tier: VRSTier): string {
  const colors: Record<VRSTier, string> = {
    1: "var(--color-tier-1)",
    2: "var(--color-tier-2)",
    3: "var(--color-tier-3)",
    4: "var(--color-tier-4)",
  };
  return colors[tier];
}

export function getStatusIcon(status: CriterionStatus): string {
  const icons: Record<CriterionStatus, string> = {
    pass: "\u2705",
    partial: "\u26A0\uFE0F",
    fail: "\u274C",
    hidden: "\uD83D\uDD0D",
  };
  return icons[status];
}
