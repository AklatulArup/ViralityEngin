import type { EngagementDecay, ContentPhase, EnrichedVideo } from "./types";

export function computeEngagementDecay(video: EnrichedVideo): EngagementDecay {
  const { views, days, velocity, engagement } = video;

  const dailyVelocity = velocity;
  const weeklyVelocity = Math.round(dailyVelocity * 7);

  // Estimate decay rate
  let decayRate: number;
  if (days < 7) {
    decayRate = 0.1; // too early
  } else if (days < 30) {
    // Compare current velocity to what initial velocity would have been
    const estimatedInitialVelocity = views / Math.min(days, 3);
    decayRate = Math.max(0, 1 - dailyVelocity / (estimatedInitialVelocity || 1));
  } else if (days < 90) {
    // Expected velocity at this age: views / days should decrease
    const expectedVelocity = views / days;
    decayRate = Math.max(0, 1 - dailyVelocity / (expectedVelocity * 2 || 1));
  } else {
    // Old video — high velocity means evergreen
    const ageExpectedVelocity = views / (days * 1.5);
    decayRate = dailyVelocity > ageExpectedVelocity ? 0.2 : 0.7;
  }
  decayRate = Math.max(0, Math.min(1, decayRate));

  // Determine phase
  let currentPhase: ContentPhase;
  if (days < 14 && decayRate < 0.4) {
    currentPhase = "growth";
  } else if (days > 60 && decayRate < 0.3 && engagement > 2) {
    currentPhase = "evergreen";
  } else if (decayRate > 0.6) {
    currentPhase = "decay";
  } else {
    currentPhase = "plateau";
  }

  const isEvergreen = currentPhase === "evergreen" || (days > 90 && decayRate < 0.3);

  // Estimate lifetime views
  let estimatedLifetimeViews: number;
  if (currentPhase === "growth") {
    estimatedLifetimeViews = Math.round(views * (1 / Math.max(decayRate, 0.1)) * 1.5);
  } else if (currentPhase === "plateau") {
    estimatedLifetimeViews = Math.round(views * 1.8);
  } else if (currentPhase === "evergreen") {
    estimatedLifetimeViews = Math.round(views * 3);
  } else {
    estimatedLifetimeViews = Math.round(views * 1.1);
  }
  estimatedLifetimeViews = Math.min(estimatedLifetimeViews, views * 10);

  const phaseLabels: Record<ContentPhase, string> = {
    growth: "Early Growth",
    plateau: "Active Plateau",
    decay: "Slow Decay",
    evergreen: "Evergreen Content",
  };

  const phaseBasis = `Published ${days} day${days !== 1 ? "s" : ""} ago, averaging ${Math.round(dailyVelocity).toLocaleString()} views/day. Decay rate: ${Math.round(decayRate * 100)}%. Engagement: ${engagement.toFixed(1)}%`;

  return {
    currentPhase,
    dailyVelocity,
    weeklyVelocity,
    estimatedLifetimeViews,
    decayRate: Math.round(decayRate * 100) / 100,
    isEvergreen,
    phaseLabel: phaseLabels[currentPhase],
    phaseBasis,
  };
}
