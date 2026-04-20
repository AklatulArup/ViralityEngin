// ═══════════════════════════════════════════════════════════════════════════
// LIFECYCLE TIER CLASSIFIER
// ═══════════════════════════════════════════════════════════════════════════
//
// Short-form platforms push content through discrete distribution tiers — the
// algorithm tests each tier's engagement thresholds before graduating the
// video to the next. The existing forecast's `blendWithTrajectory` assumes a
// smooth cumulative-share curve, which is broadly correct — but it cannot see
// when a video has STUCK at a tier boundary.
//
// The two cases that matter for view prediction:
//
// 1. TIER-1 STUCK ("200-view jail").
//    A TikTok or Reel that fails the hook test is algorithmically capped at
//    ~200-500 views regardless of creator baseline. The trajectory formula
//    will naively project views ÷ cumulativeShare, which at 6h might say
//    "400 views so far → 1,150 lifetime" — but the video is in fact frozen.
//    Detection: low views, age past the platform's hook-test window, velocity
//    collapsed. Apply a hard ceiling at current × 1.3.
//
// 2. TIER-4 PLATEAU.
//    A viral video whose velocity has decayed to near-zero has already
//    captured its audience. Trajectory formula will project upward if
//    velocity-adjustment is positive in a noisy sample, but the underlying
//    distribution is exhausted. Detection: high views, velocity decay across
//    the last 3+ samples. Apply a ceiling at current × 1.15.
//
// Tier-2-RISING and TIER-3-VIRAL don't need adjustment — the trajectory
// formula handles acceleration correctly. This module only clamps DOWN when
// evidence is strong. It never raises the forecast.
//
// Scope: TikTok, Instagram Reels, YouTube Shorts. X is time-decay driven
// (already modeled by `cumulativeShare` with 6h half-life). YouTube Long-Form
// is evergreen with no tier structure.
//
// Signal source: `VelocitySampleInput` from the velocity tracker cron. With
// the hourly GitHub Actions workflow shipped 2026-04-20, we have fine-grained
// velocity for the first 72h — enough to detect tier transitions confidently.

import type { Platform } from "./forecast";

export type LifecycleTier =
  | "tier-1-hook"       // 0 — 500 views, still in initial test window, velocity unknown/early
  | "tier-1-stuck"      // failed hook test — capped ~500
  | "tier-2-rising"     // in retention push, velocity healthy
  | "tier-2-stuck"      // stalled at retention tier
  | "tier-3-viral"      // scaling past 50k+, velocity still positive
  | "tier-4-plateau"    // audience saturated, velocity decaying
  | "not-applicable";   // evergreen platform or insufficient data

export interface TierClassification {
  tier:           LifecycleTier;
  confidence:     "high" | "medium" | "low";
  rationale:      string;
  // If set: the forecast lifetime.high should be min(current, impliedCeiling).
  // Null means the tier does not imply a firm ceiling (upside still open).
  impliedCeiling: number | null;
}

export interface TierInput {
  platform:        Platform;
  currentViews:    number;
  ageHours:        number;
  velocitySamples: Array<{ ageHours: number; views: number; velocity: number; acceleration: number }>;
}

// ─── PLATFORM THRESHOLDS ──────────────────────────────────────────────────
//
// Derived from platform-algorithms-2026.md. Numbers are midpoints of the
// ranges the doc cites; the classifier allows ±30% slack via the "confidence"
// field rather than hard cutoffs.

interface TierThresholds {
  // Hook-test window: if age is below this, we can't distinguish tier-1-stuck
  // from tier-1-hook yet. Don't clamp.
  hookTestWindowHours: number;
  // Views below this AND hook window elapsed = tier-1-stuck.
  tier1StuckCeiling:   number;
  // Views below this at "stuck" state = tier-2-stuck.
  tier2StuckCeiling:   number;
  // Viral floor — above this, only tier-3 or tier-4 possible.
  viralFloor:          number;
}

const THRESHOLDS: Partial<Record<Platform, TierThresholds>> = {
  tiktok: {
    hookTestWindowHours: 6,
    tier1StuckCeiling:   500,
    tier2StuckCeiling:   50_000,
    viralFloor:          50_000,
  },
  instagram: {
    hookTestWindowHours: 6,
    tier1StuckCeiling:   300,
    tier2StuckCeiling:   20_000,
    viralFloor:          30_000,
  },
  youtube_short: {
    hookTestWindowHours: 12,          // Shorts get a longer initial test
    tier1StuckCeiling:   1_000,
    tier2StuckCeiling:   100_000,
    viralFloor:          100_000,
  },
};

// ─── CLASSIFIER ───────────────────────────────────────────────────────────

export function classifyLifecycleTier(input: TierInput): TierClassification {
  const { platform, currentViews, ageHours, velocitySamples } = input;
  const thresholds = THRESHOLDS[platform];

  // Platforms without tier structure
  if (!thresholds) {
    return {
      tier:           "not-applicable",
      confidence:     "high",
      rationale:      platform === "x"
        ? "X is time-decay driven (6h half-life) — no discrete tier structure applies."
        : "YouTube Long-Form is evergreen with no tier structure.",
      impliedCeiling: null,
    };
  }

  // Pre-publish or brand-new videos
  if (currentViews === 0 || ageHours < 0.5) {
    return {
      tier:           "tier-1-hook",
      confidence:     "low",
      rationale:      "Video is too new to classify — hook test not yet run.",
      impliedCeiling: null,
    };
  }

  // Recency-weighted velocity & acceleration from the last 3 samples. If we
  // have fewer than 2 samples, we can only make a coarse call.
  const recent   = velocitySamples.slice(-3);
  const hasTrend = recent.length >= 2;
  const avgVelocity = recent.length > 0
    ? recent.reduce((s, v) => s + v.velocity, 0) / recent.length
    : currentViews / Math.max(0.5, ageHours);   // fallback: naive views/hour
  const avgAccel = recent.length > 0
    ? recent.reduce((s, v) => s + v.acceleration, 0) / recent.length
    : 0;

  // ── Tier 1: below hook-test ceiling ─────────────────────────────────────
  if (currentViews < thresholds.tier1StuckCeiling) {
    if (ageHours < thresholds.hookTestWindowHours) {
      return {
        tier:           "tier-1-hook",
        confidence:     "medium",
        rationale:      `Still within ${thresholds.hookTestWindowHours}h hook-test window — too early to call. ${currentViews} views so far.`,
        impliedCeiling: null,
      };
    }
    // Past hook window and still below ceiling — stuck in 200-view jail.
    // The "stuck ceiling" is the audience the algo actually showed it to
    // plus a small tail; anything beyond is vanishingly unlikely.
    const ceiling = Math.max(currentViews * 1.3, thresholds.tier1StuckCeiling);
    return {
      tier:           "tier-1-stuck",
      confidence:     hasTrend ? "high" : "medium",
      rationale:      `Past ${thresholds.hookTestWindowHours}h hook window with only ${currentViews.toLocaleString()} views — failed to clear the hook-test threshold. Algorithm stopped promoting.`,
      impliedCeiling: Math.round(ceiling),
    };
  }

  // ── Tier 2 / Tier 3 boundary ────────────────────────────────────────────
  if (currentViews < thresholds.viralFloor) {
    // In retention-push tier. Distinguish rising from stuck by velocity trend.
    // "Slow" = gaining less than 0.1% of current views per hour — a 50k video
    // adding <50 views/hour is plateauing at its ceiling.
    const slowThreshold = currentViews * 0.001;

    if (!hasTrend) {
      return {
        tier:           "tier-2-rising",
        confidence:     "low",
        rationale:      `${currentViews.toLocaleString()} views — in retention-push tier. Need more velocity samples to assess trajectory.`,
        impliedCeiling: null,
      };
    }

    if (avgVelocity < slowThreshold && avgAccel <= 0) {
      // Stuck at Tier 2 — clamp near current.
      const ceiling = Math.round(currentViews * 1.25);
      return {
        tier:           "tier-2-stuck",
        confidence:     "high",
        rationale:      `${currentViews.toLocaleString()} views with velocity of only ${Math.round(avgVelocity)} views/hour. Retention push has stalled — unlikely to escape this tier.`,
        impliedCeiling: ceiling,
      };
    }

    // Rising — leave forecast upside open.
    return {
      tier:           "tier-2-rising",
      confidence:     avgAccel > 0 ? "high" : "medium",
      rationale:      `${currentViews.toLocaleString()} views, ${avgAccel > 0 ? "accelerating" : "holding"} at ${Math.round(avgVelocity)} views/hour. In retention push — may graduate to viral tier if velocity holds.`,
      impliedCeiling: null,
    };
  }

  // ── Tier 3 / Tier 4: viral or plateau ───────────────────────────────────
  if (!hasTrend) {
    return {
      tier:           "tier-3-viral",
      confidence:     "low",
      rationale:      `${currentViews.toLocaleString()} views — past viral floor. Need velocity samples to distinguish active scaling from plateau.`,
      impliedCeiling: null,
    };
  }

  // Consistent deceleration across recent samples → plateau
  const decelerating = recent.every(s => s.acceleration <= 0) && avgAccel < 0;
  // Very low velocity relative to accumulated views = audience exhausted
  const velocityRatio = avgVelocity / currentViews;   // per-hour growth rate
  const exhausted = velocityRatio < 0.002;             // <0.2% per hour

  if (decelerating && exhausted) {
    const ceiling = Math.round(currentViews * 1.15);
    return {
      tier:           "tier-4-plateau",
      confidence:     "high",
      rationale:      `${currentViews.toLocaleString()} views, velocity decayed to ${Math.round(avgVelocity)}/hour (${(velocityRatio * 100).toFixed(2)}% per hour). Audience saturated — small tail only.`,
      impliedCeiling: ceiling,
    };
  }

  // Still viral / scaling
  return {
    tier:           "tier-3-viral",
    confidence:     avgAccel > 0 ? "high" : "medium",
    rationale:      `${currentViews.toLocaleString()} views at ${Math.round(avgVelocity)}/hour${avgAccel > 0 ? ", still accelerating" : ""}. In viral scaling phase — upside open.`,
    impliedCeiling: null,
  };
}

// ─── APPLY TO FORECAST ────────────────────────────────────────────────────
//
// Returns adjusted lifetime bounds. Never raises — only clamps down when the
// tier implies a firm ceiling.

export function applyTierCeiling(
  lifetime:  { low: number; median: number; high: number },
  currentViews: number,
  classification: TierClassification,
): { low: number; median: number; high: number; adjusted: boolean } {
  if (classification.impliedCeiling == null) {
    return { ...lifetime, adjusted: false };
  }

  const ceiling = Math.max(currentViews, classification.impliedCeiling);
  if (lifetime.high <= ceiling && lifetime.median <= ceiling) {
    // Existing forecast already within the ceiling — nothing to do.
    return { ...lifetime, adjusted: false };
  }

  // Clamp. Keep low (a ceiling shouldn't raise the floor) and preserve
  // ordering low ≤ median ≤ high.
  const high   = Math.min(lifetime.high, ceiling);
  const median = Math.min(lifetime.median, Math.round(ceiling * 0.85));
  const low    = Math.min(lifetime.low, median);

  return { low, median, high, adjusted: true };
}
