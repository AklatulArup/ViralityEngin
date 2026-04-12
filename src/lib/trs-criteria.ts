import type { VideoData, VRSCriterion } from "./types";

// TikTok Readiness Score: 20 criteria, 100 points total
// Based on TikTok's algorithm signals: shares are 27x more powerful than likes,
// watch time ratio drives exponential distribution, saves signal long-term value.

// Helper to safely access TikTok-specific fields
function getTikTok(d: VideoData) {
  return {
    shares: d.shares ?? 0,
    saves: d.saves ?? 0,
    tags: d.tags || [],
    followers: (d as { creatorFollowers?: number }).creatorFollowers ?? 0,
    soundName: (d as { soundName?: string }).soundName ?? "",
  };
}

export const TT_CRITERIA: VRSCriterion[] = [
  // ─── TIER 1: Critical (50 points) ───
  {
    id: "tt-share-rate",
    label: "Share Rate",
    weight: 12,
    tier: 1,
    autoAssessable: true,
    check: (d: VideoData) => {
      const { shares } = getTikTok(d);
      if (d.views === 0) return 0;
      const ratio = (shares / d.views) * 100;
      return ratio >= 1 ? 1 : ratio >= 0.3 ? 0.5 : 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const { shares } = getTikTok(d);
      const ratio = d.views > 0 ? ((shares / d.views) * 100).toFixed(3) : "0";
      if (score === 1)
        return `Share rate is ${ratio}% (>=1%). Exceptional — shares are TikTok's #1 signal, weighted 27x more than likes. This content is being actively spread.`;
      if (score === 0.5)
        return `Share rate is ${ratio}% (0.3-1%). Decent sharing activity but below viral threshold. Add a stronger "send this to someone who..." CTA.`;
      return `Share rate is ${ratio}% (<0.3%). Low sharing — the #1 growth signal on TikTok. Content needs a more shareable hook or relatable moment.`;
    },
  },
  {
    id: "tt-watch-time",
    label: "Watch Time Proxy",
    weight: 11,
    tier: 1,
    autoAssessable: true,
    check: (d: VideoData) => {
      const { followers } = getTikTok(d);
      if (d.views === 0 || d.durationSeconds === 0) return null;
      // Proxy: high views relative to followers + short duration = high completion
      const viewsPerFollower = followers > 0 ? d.views / followers : 1;
      const isShort = d.durationSeconds <= 60;
      if (viewsPerFollower > 3 && isShort) return 1;
      if (viewsPerFollower > 1 || (viewsPerFollower > 0.5 && isShort)) return 0.5;
      return 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const { followers } = getTikTok(d);
      const vpf = followers > 0 ? (d.views / followers).toFixed(1) : "N/A";
      if (score === null)
        return "Insufficient data for watch time estimation (needs views and duration).";
      if (score === 1)
        return `Views/follower ratio: ${vpf}x with ${d.durationSeconds}s duration. Strong completion signal — short video with high reach suggests excellent watch-through rate.`;
      if (score === 0.5)
        return `Views/follower ratio: ${vpf}x. Moderate reach — content is getting some FYP distribution but not maximum completion.`;
      return `Views/follower ratio: ${vpf}x. Low reach relative to audience — suggests viewers aren't watching to completion. Shorten or add a stronger hook.`;
    },
  },
  {
    id: "tt-save-rate",
    label: "Save Rate",
    weight: 9,
    tier: 1,
    autoAssessable: true,
    check: (d: VideoData) => {
      const { saves } = getTikTok(d);
      if (d.views === 0) return 0;
      const ratio = (saves / d.views) * 100;
      return ratio >= 0.5 ? 1 : ratio >= 0.2 ? 0.5 : 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const { saves } = getTikTok(d);
      const ratio = d.views > 0 ? ((saves / d.views) * 100).toFixed(3) : "0";
      if (score === 1)
        return `Save rate is ${ratio}% (>=0.5%). Viewers are bookmarking for later — strong signal of long-term value content.`;
      if (score === 0.5)
        return `Save rate is ${ratio}% (0.2-0.5%). Some save activity — add more "save this for later" CTAs or actionable tips.`;
      return `Save rate is ${ratio}% (<0.2%). Low saves — content needs more reference value. Tips, tutorials, and lists drive saves.`;
    },
  },
  {
    id: "tt-comment-engagement",
    label: "Comment Engagement",
    weight: 9,
    tier: 1,
    autoAssessable: true,
    check: (d: VideoData) => {
      if (d.views === 0) return 0;
      const ratio = (d.comments / d.views) * 100;
      return ratio >= 0.5 ? 1 : ratio >= 0.2 ? 0.5 : 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const ratio = d.views > 0 ? ((d.comments / d.views) * 100).toFixed(3) : "0";
      if (score === 1)
        return `Comment rate is ${ratio}% (>=0.5%). Strong discussion — TikTok heavily boosts debate-worthy content. Replies become mini-videos in feeds.`;
      if (score === 0.5)
        return `Comment rate is ${ratio}% (0.2-0.5%). Moderate discussion. Ask polarizing questions or add a "hot take" to drive more comments.`;
      return `Comment rate is ${ratio}% (<0.2%). Low comments signal passive viewing. Add opinion prompts, "what would you do?" scenarios, or controversial takes.`;
    },
  },
  {
    id: "tt-hook",
    label: "Hook Effectiveness (1st second)",
    weight: 9,
    tier: 1,
    autoAssessable: false,
    check: () => null,
    rationale: () =>
      "TikTok's first-second hook is the most critical factor — a visual pattern interrupt that stops the scroll. Requires video review to assess. Look for: text overlay in frame 1, unexpected visual, direct eye contact, or movement.",
  },

  // ─── TIER 2: Strong (28 points) ───
  {
    id: "tt-caption",
    label: "Caption Quality",
    weight: 8,
    tier: 2,
    autoAssessable: true,
    check: (d: VideoData) => {
      const caption = d.description || d.title;
      if (!caption) return 0;
      const len = caption.length;
      const hasCTA = /comment|share|follow|save|tag|send|watch/i.test(caption);
      const hasQuestion = /\?/.test(caption);
      const hasPowerWord = /secret|shocking|never|truth|insane|viral|pov|watch till/i.test(caption);
      const signals = [
        len >= 50 && len <= 150,
        hasCTA,
        hasQuestion,
        hasPowerWord,
      ].filter(Boolean).length;
      return signals >= 3 ? 1 : signals >= 2 ? 0.5 : 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const caption = d.description || d.title;
      const len = caption?.length ?? 0;
      if (score === 1)
        return `Caption (${len} chars) has strong hooks: power words, CTA, or questions. Great for driving engagement from the text overlay.`;
      if (score === 0.5)
        return `Caption (${len} chars) has some engagement triggers but missing key elements. Add a CTA, question, or power word.`;
      return `Caption (${len} chars) is weak — missing power words, CTAs, and questions. Strong captions are 50-150 chars with a clear hook.`;
    },
  },
  {
    id: "tt-hashtags",
    label: "Hashtag Strategy",
    weight: 5,
    tier: 2,
    autoAssessable: true,
    check: (d: VideoData) => {
      const count = d.tags.length;
      return count >= 3 && count <= 5
        ? 1
        : (count >= 1 && count <= 2) || (count >= 6 && count <= 10)
          ? 0.5
          : 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const count = d.tags.length;
      if (score === 1)
        return `${count} hashtags (ideal 3-5). Good balance of discoverability without looking spammy. Mix niche + trending tags.`;
      if (score === 0.5)
        return `${count} hashtags. ${count < 3 ? "Too few — add niche-specific tags" : "Slightly many — reduce to 3-5 most relevant"}. TikTok's algorithm uses hashtags for initial distribution.`;
      return `${count} hashtags. ${count === 0 ? "None — missing a key discovery signal" : "Too many (>10) — dilutes topic signal"}. Use 3-5 focused hashtags: 2 niche + 1-2 trending.`;
    },
  },
  {
    id: "tt-sound",
    label: "Sound Strategy",
    weight: 5,
    tier: 2,
    autoAssessable: true,
    check: (d: VideoData) => {
      const { soundName } = getTikTok(d);
      return soundName ? 1 : 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const { soundName } = getTikTok(d);
      if (score === 1)
        return `Sound: "${soundName || "detected"}". Trending sounds boost FYP placement. Videos using popular sounds get up to 5x more distribution.`;
      return "No sound detected. Adding a trending or relevant sound significantly boosts discoverability on TikTok.";
    },
  },
  {
    id: "tt-velocity",
    label: "Engagement Velocity",
    weight: 5,
    tier: 2,
    autoAssessable: true,
    check: (d: VideoData) => {
      if (d.views === 0) return 0;
      const daysOld = Math.max(
        1,
        (Date.now() - new Date(d.publishedAt).getTime()) / 86400000
      );
      const viewsPerDay = d.views / daysOld;
      // High velocity thresholds for TikTok (faster platform)
      return viewsPerDay >= 10000 ? 1 : viewsPerDay >= 1000 ? 0.5 : 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const daysOld = Math.max(
        1,
        (Date.now() - new Date(d.publishedAt).getTime()) / 86400000
      );
      const vpd = Math.round(d.views / daysOld);
      if (score === 1)
        return `${vpd.toLocaleString()} views/day — strong velocity indicates active FYP distribution.`;
      if (score === 0.5)
        return `${vpd.toLocaleString()} views/day — moderate velocity. Content is circulating but not peaking.`;
      return `${vpd.toLocaleString()} views/day — low velocity. Content may not be getting FYP distribution. Optimize hook and first-second retention.`;
    },
  },
  {
    id: "tt-profile-visit",
    label: "Profile Visit Signal",
    weight: 5,
    tier: 2,
    autoAssessable: false,
    check: () => null,
    rationale: () =>
      "Profile visits after viewing signal strong interest. Requires TikTok analytics to assess. A high profile-visit rate means the viewer wants more of your content — a top growth signal.",
  },

  // ─── TIER 3: Support (15 points) ───
  {
    id: "tt-duration",
    label: "Duration Optimization",
    weight: 4,
    tier: 3,
    autoAssessable: true,
    check: (d: VideoData) => {
      const sec = d.durationSeconds;
      if (sec >= 15 && sec <= 60) return 1;
      if ((sec >= 5 && sec < 15) || (sec > 60 && sec <= 180)) return 0.5;
      return 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const sec = d.durationSeconds;
      if (score === 1)
        return `Duration: ${sec}s (optimal 15-60s). This length maximizes completion rate, which is TikTok's primary ranking signal.`;
      if (score === 0.5)
        return `Duration: ${sec}s. ${sec < 15 ? "Very short — may not give enough value for saves/shares" : "Long-form (1-3 min) can work for depth content but risks drop-off"}.`;
      return `Duration: ${sec}s. ${sec < 5 ? "Too short to generate meaningful engagement" : "Over 3 minutes — high risk of viewer drop-off on TikTok. Consider splitting into parts"}.`;
    },
  },
  {
    id: "tt-frequency",
    label: "Posting Frequency",
    weight: 3,
    tier: 3,
    autoAssessable: false,
    check: () => null,
    rationale: () =>
      "TikTok rewards consistent posting (1-3x daily during growth, minimum 4x/week maintenance). Requires account-level data to assess.",
  },
  {
    id: "tt-duet-stitch",
    label: "Duet/Stitch Potential",
    weight: 3,
    tier: 3,
    autoAssessable: false,
    check: () => null,
    rationale: () =>
      "Content that invites duets/stitches gets amplified through collaborative engagement. Hot takes, challenges, and reaction-worthy clips have highest duet potential.",
  },
  {
    id: "tt-caption-content",
    label: "Content-Caption Alignment",
    weight: 3,
    tier: 3,
    autoAssessable: false,
    check: () => null,
    rationale: () =>
      "Caption should complement (not repeat) the video content. Best captions add context, ask a question, or create a second layer of engagement. Requires video review.",
  },
  {
    id: "tt-vertical",
    label: "Vertical Format",
    weight: 2,
    tier: 3,
    autoAssessable: true,
    check: () => 1, // TikTok is inherently vertical
    rationale: () =>
      "TikTok content is natively vertical (9:16). Auto-pass for TikTok-native uploads.",
  },

  // ─── TIER 4: Baseline (7 points) ───
  {
    id: "tt-native-feel",
    label: "Native Content Feel",
    weight: 2,
    tier: 4,
    autoAssessable: false,
    check: () => null,
    rationale: () =>
      "TikTok's algorithm deprioritizes overly polished, 'ad-like' content. Native feel = phone-shot aesthetic, authentic delivery, no watermarks from other platforms. Requires video review.",
  },
  {
    id: "tt-authority",
    label: "Creator Authority",
    weight: 2,
    tier: 4,
    autoAssessable: true,
    check: (d: VideoData) => {
      const { followers } = getTikTok(d);
      return followers >= 100000 ? 1 : followers >= 10000 ? 0.5 : 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const { followers } = getTikTok(d);
      if (score === 1)
        return `${followers.toLocaleString()} followers (100K+). Established creator authority — algorithm gives initial distribution boost.`;
      if (score === 0.5)
        return `${followers.toLocaleString()} followers (10K+). Growing authority — content quality matters more than follower count on TikTok.`;
      return `${followers.toLocaleString()} followers (<10K). Smaller account — TikTok still distributes great content regardless of follower count, but the initial push is smaller.`;
    },
  },
  {
    id: "tt-hashtag-relevance",
    label: "Hashtag Niche Relevance",
    weight: 1.5,
    tier: 4,
    autoAssessable: true,
    check: (d: VideoData) => {
      const nicheTerms = [
        "trading", "forex", "crypto", "funded", "propfirm", "prop firm",
        "daytrading", "scalping", "futures", "stocks", "investing",
        "fundednext", "money", "finance", "wealth",
      ];
      const hashtags = d.tags.map((t) => t.toLowerCase());
      const matches = hashtags.filter((h) =>
        nicheTerms.some((n) => h.includes(n))
      ).length;
      return matches >= 2 ? 1 : matches >= 1 ? 0.5 : 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      if (score === 1)
        return `Hashtags contain multiple niche-relevant terms (trading/finance/funded). Content is clearly positioned within the trading niche for targeted distribution.`;
      if (score === 0.5)
        return `Some niche relevance in hashtags. Add more specific terms like #propfirm, #fundednext, #daytrading for better niche targeting.`;
      return `No niche-relevant hashtags detected. Add trading/finance-specific tags to reach the right audience on TikTok's FYP.`;
    },
  },
  {
    id: "tt-caption-length",
    label: "Caption Length",
    weight: 1,
    tier: 4,
    autoAssessable: true,
    check: (d: VideoData) => {
      const len = (d.description || d.title).length;
      return len >= 50 && len <= 150
        ? 1
        : (len >= 20 && len < 50) || (len > 150 && len <= 300)
          ? 0.5
          : 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const len = (d.description || d.title).length;
      if (score === 1)
        return `Caption length: ${len} chars (ideal 50-150). Enough to hook but not overwhelm.`;
      if (score === 0.5)
        return `Caption length: ${len} chars. ${len < 50 ? "A bit short — add a CTA or question" : "Somewhat long — TikTok captions work best when concise"}.`;
      return `Caption length: ${len} chars. ${len < 20 ? "Too short to add context" : "Over 300 chars — TikTok truncates long captions. Keep it punchy"}.`;
    },
  },
  {
    id: "tt-consistency",
    label: "Posting Consistency",
    weight: 0.5,
    tier: 4,
    autoAssessable: false,
    check: () => null,
    rationale: () =>
      "TikTok's algorithm rewards accounts that post consistently. Irregular posting signals can reduce distribution. Requires account-level data to assess.",
  },
];
