import type { VideoData, VRSCriterion } from "./types";

// Instagram Reels Readiness Score (IRS) — 2026 edition
// 20 criteria, 100 points total.
//
// Sources: Adam Mosseri official updates (Jan 2025, Sept 2025, Feb 2026),
// creators.instagram.com, Hootsuite 2026 Instagram Algorithm Guide,
// Later 2025 Benchmarks, Social Insider 2025 Analysis.
//
// THREE CONFIRMED RANKING SIGNALS (Mosseri, January 2025):
//   1. Watch Time — most important for both connected and unconnected reach
//   2. Sends per Reach — 3-5x more valuable than likes for reaching non-followers
//   3. Likes per Reach — still matters, weighted more for connected reach (existing followers)
//
// 2026 structural changes folded in:
//  • Originality Score: accounts posting 10+ reposts in 30 days are excluded from recommendations entirely.
//  • Watermarks from TikTok/CapCut/YT = immediate recommendation disqualification.
//  • Reels can be up to 3 minutes and now reach non-followers through recommendations.
//  • "Your Algorithm" (Dec 2025): users can add/remove topics from their own Reel recommendations.
//  • Trial Reels: test content with non-followers before exposing to existing audience.
//  • Keyword-rich captions outperform hashtag-heavy posts for discovery (~30% more reach).
//  • Hashtags: 3-5 specific is enough. Stuffed posts are filtered.
//  • Audition system: first shown to small non-follower test group. Fail = throttled before followers see it.
//  • Bottom nav update (Sept 2025): Reels + DMs are now primary surfaces.

function getIG(d: VideoData) {
  return {
    shares:    d.shares ?? 0,  // DM sends (primary signal)
    saves:     d.saves ?? 0,
    tags:      d.tags || [],
    followers: (d as { creatorFollowers?: number }).creatorFollowers ?? 0,
    description: d.description || "",
  };
}

export const IG_CRITERIA: VRSCriterion[] = [

  // ─── TIER 1: The Three Confirmed Signals (55 points) ─────────────────────

  {
    id: "ig-watch-time",
    label: "Watch time  (Mosseri: most important signal)",
    weight: 18,
    tier: 1,
    autoAssessable: true,
    check: (d: VideoData) => {
      const { followers } = getIG(d);
      if (d.views === 0 || d.durationSeconds === 0) return null;
      const viewsPerFollower = followers > 0 ? d.views / followers : 1;
      const dur = d.durationSeconds;
      // Sweet spot: short enough for high completion (15-30s) OR 60s+ with strong retention signal
      const optimalShort = dur >= 15 && dur <= 30;
      const optimalLong  = dur >= 60 && dur <= 180;
      if (viewsPerFollower > 2.5 && (optimalShort || optimalLong)) return 1;
      if (viewsPerFollower > 1 && dur <= 90) return 0.5;
      return 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const { followers } = getIG(d);
      const vpf = followers > 0 ? (d.views / followers).toFixed(1) : "N/A";
      const dur = d.durationSeconds;
      if (score === null) return "Insufficient data.";
      if (score === 1)
        return `${vpf}x reach vs follower count, ${dur}s duration. Watch time is Instagram's #1 ranking signal across all surfaces (Mosseri, January 2025). Strong signal that viewers watched to completion or rewatched — the core trigger for Reels distribution to non-followers.`;
      if (score === 0.5)
        return `${vpf}x reach, ${dur}s. Moderate. Up to 50% of viewers drop off in the first 3 seconds. A Reel with strong 3-second hold (60%+) outperforms weak ones by 5-10x in total reach. A 15s Reel watched to completion twice beats a 60s Reel where 80% drop off at second 5.`;
      return `${vpf}x reach, ${dur}s. Weak watch time signal. Cut to 15-30s, or restructure so the value delivery happens before the 3-second drop-off cliff.`;
    },
  },
  {
    id: "ig-sends-per-reach",
    label: "DM Sends per Reach  (3-5x a like — top growth signal)",
    weight: 17,
    tier: 1,
    autoAssessable: true,
    check: (d: VideoData) => {
      const { shares } = getIG(d);
      if (d.views === 0) return 0;
      const sendRate = (shares / d.views) * 100;
      if (sendRate >= 1)   return 1;
      if (sendRate >= 0.3) return 0.5;
      return 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const { shares } = getIG(d);
      const rate = d.views > 0 ? ((shares / d.views) * 100).toFixed(3) : "0";
      if (score === 1)
        return `Send rate ${rate}%, strong. DM sends are 3-5x more valuable than likes for reaching non-followers (Mosseri, January 2025). 694,000 Reels are sent via DM every minute (Metricool, 2025). This is the #1 growth signal on Instagram.`;
      if (score === 0.5)
        return `Send rate ${rate}%, moderate. Design for the "send this to someone who..." moment. Validation content (tribal identity), anxiety content (warning a specific person), and amusement (social bonding) drive DM sends. Generic content doesn't.`;
      return `Send rate ${rate}%, weak. On Instagram, DM sends matter more than any other action for reaching new audiences. Build content that creates an impulse to forward to a specific person: relatable struggles, warning posts, inside-joke humour, tribal identity signals.`;
    },
  },
  {
    id: "ig-likes-per-reach",
    label: "Likes per Reach  (connected reach signal)",
    weight: 10,
    tier: 1,
    autoAssessable: true,
    check: (d: VideoData) => {
      if (d.views === 0) return 0;
      const likeRate = (d.likes / d.views) * 100;
      // Instagram measures likes as a ratio, not raw count
      if (likeRate >= 5)   return 1;
      if (likeRate >= 2)   return 0.5;
      return 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const rate = d.views > 0 ? ((d.likes / d.views) * 100).toFixed(2) : "0";
      if (score === 1)
        return `Like rate ${rate}%, strong. Instagram measures likes per reach, not raw likes. A post with 50 likes from 500 reach (10% like rate) outranks one with 200 likes from 10,000 reach (2%). This signal matters most for connected reach: keeping your existing followers engaged.`;
      if (score === 0.5)
        return `Like rate ${rate}%, moderate. Likes matter more for reaching your existing followers than for unconnected reach. Prioritise sends and watch time for growth; likes are a secondary health signal.`;
      return `Like rate ${rate}%, weak. Low like rate suggests the content isn't resonating with your existing followers, which hurts connected reach. Check if you've drifted from your niche.`;
    },
  },
  {
    id: "ig-save-rate",
    label: "Save rate  (reference value signal)",
    weight: 10,
    tier: 1,
    autoAssessable: true,
    check: (d: VideoData) => {
      const { saves } = getIG(d);
      if (d.views === 0) return 0;
      const rate = (saves / d.views) * 100;
      if (rate >= 1)    return 1;
      if (rate >= 0.3)  return 0.5;
      return 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const { saves } = getIG(d);
      const rate = d.views > 0 ? ((saves / d.views) * 100).toFixed(3) : "0";
      if (score === 1)
        return `Save rate ${rate}%, strong. A save tells Instagram the content is worth returning to. Educational, reference, and practical posts earn saves. Saves carry far more weight than likes in the ranking formula.`;
      if (score === 0.5)
        return `Save rate ${rate}%, moderate. Add a specific checklist, a comparison table, or a concrete rule that viewers want to keep. Reference utility drives saves.`;
      return `Save rate ${rate}%, weak. Entertainment without utility gets watched and forgotten. Add one piece of specific, practical information per Reel that viewers will want to return to.`;
    },
  },

  // ─── TIER 2: Strong signals (25 points) ──────────────────────────────────

  {
    id: "ig-originality",
    label: "Originality  (no watermarks, not a repost)",
    weight: 7,
    tier: 2,
    autoAssessable: true,
    check: (d: VideoData) => {
      const { description } = getIG(d);
      const t = description.toLowerCase();
      const repostMarkers = /repost|via @|credit:|cr:|original:|reposted/.test(t);
      // Check for cross-platform watermark text (TikTok, CapCut usernames, etc.)
      const hasCrossPlatformText = /tiktok|capcut|youtube/.test(t);
      if (repostMarkers || hasCrossPlatformText) return 0;
      return 1;
    },
    rationale: (_d: VideoData, score: number | null) => {
      if (score === 1)
        return `No repost markers or cross-platform indicators detected. Instagram 2026 actively penalises reposted content. Accounts posting 10+ reposts in 30 days are excluded from Explore and Reels recommendations entirely (Net Influencer data). Original Reels see 40-60% more distribution than reposts.`;
      return `Repost or cross-platform watermark detected. Instagram's 2026 Originality Score catches these. A TikTok watermark or "reposted from @" caption is enough to disqualify the post from recommendations. Reshoot or re-edit natively before posting.`;
    },
  },
  {
    id: "ig-comment-quality",
    label: "Comment depth  (substantive > emoji)",
    weight: 6,
    tier: 2,
    autoAssessable: true,
    check: (d: VideoData) => {
      if (d.views === 0) return 0;
      const rate = (d.comments / d.views) * 100;
      if (rate >= 1)    return 1;
      if (rate >= 0.3)  return 0.5;
      return 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const rate = d.views > 0 ? ((d.comments / d.views) * 100).toFixed(3) : "0";
      if (score === 1)
        return `Comment rate ${rate}%, strong. Instagram 2026 weights conversation depth over raw count. Thread conversations and detailed reactions signal real engagement. Short filler comments carry minimal weight.`;
      if (score === 0.5)
        return `Comment rate ${rate}%, moderate. Reply substantively to the first 5-10 comments within the first hour. Two-way conversation compounds the signal.`;
      return `Comment rate ${rate}%, weak. Low comment engagement limits connected reach. Ask a specific question in the caption — not "what do you think?" but a forced-choice question that invites a specific answer.`;
    },
  },
  {
    id: "ig-hook-3s",
    label: "3-second hold  (audition phase gate)",
    weight: 6,
    tier: 2,
    autoAssessable: true,
    check: (d: VideoData) => {
      const text = (d.description || d.title || "").toLowerCase();
      const hasNumber = /\d+|\$|%/.test(text.slice(0, 60));
      const hasBoldClaim = /never|always|stop|only|truth|why|how|this|secret|actually|unpopular/.test(text.slice(0, 100));
      const hasQuestion = /\?/.test(text.slice(0, 80));
      if ((hasNumber || hasBoldClaim) && hasQuestion) return 1;
      if (hasNumber || hasBoldClaim || hasQuestion) return 0.75;
      return 0.25;
    },
    rationale: (d: VideoData, _score: number | null) => {
      const first = (d.description || d.title || "").slice(0, 80);
      return `First 80 chars: "${first}". Instagram 2026 uses an "audition system" (Mosseri): new Reels are first shown to a small non-follower test group. If 3-second hold fails there, the Reel gets throttled BEFORE your own followers see it. The hook must appear in the first 1.5 seconds, before the caption overlay.`;
    },
  },
  {
    id: "ig-captions-keywords",
    label: "Keyword-rich caption  (Instagram SEO)",
    weight: 6,
    tier: 2,
    autoAssessable: true,
    check: (d: VideoData) => {
      const { description, tags } = getIG(d);
      const len = description.length;
      const hasKeywords = tags.length >= 3 && tags.length <= 5;
      const hasKeywordCaption = len > 80 && len < 250;
      if (hasKeywords && hasKeywordCaption) return 1;
      if (hasKeywords || hasKeywordCaption) return 0.5;
      return 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const { description, tags } = getIG(d);
      if (score === 1)
        return `Caption is ${description.length} chars with ${tags.length} hashtags. Optimal. Instagram 2026: keyword-rich captions drive ~30% more reach than hashtag-heavy posts. Instagram Search reads caption language like page copy — write naturally but include the words your target viewer would search.`;
      if (score === 0.5)
        return `Partial SEO signal. Write a 100-200 character caption with the actual search terms your audience uses. Mosseri has explicitly listed captions as a Reels ranking factor.`;
      return `Weak SEO signal. A generic or hashtag-only caption misses Instagram's search surface entirely. Include target keywords naturally in the first 125 chars (above the "more" fold).`;
    },
  },

  // ─── TIER 3: Supporting (12 points) ──────────────────────────────────────

  {
    id: "ig-duration-fit",
    label: "Duration fit  (15-30s OR 60-180s)",
    weight: 4,
    tier: 3,
    autoAssessable: true,
    check: (d: VideoData) => {
      const dur = d.durationSeconds;
      // 2026: Reels up to 3 minutes get recommended to non-followers
      if ((dur >= 15 && dur <= 30) || (dur >= 60 && dur <= 180)) return 1;
      if (dur >= 10 && dur <= 60) return 0.5;
      return 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const dur = d.durationSeconds;
      if (score === 1)
        return `${dur}s duration. Fits 2026 optimal band. 15-30s = highest completion rate; 60-180s = long-form Reel push (Instagram extended Reels to 3 min and now recommends longer ones to non-followers).`;
      if (score === 0.5)
        return `${dur}s, moderate fit. Instagram 2026 rewards either short-and-complete (15-30s) or long-and-held (60s+). 45-55s is the dead zone.`;
      return `${dur}s, suboptimal. Cut to under 30s or extend to 60+ for better algorithmic fit.`;
    },
  },
  {
    id: "ig-hashtag-restraint",
    label: "Hashtags — 3 to 5 specific",
    weight: 4,
    tier: 3,
    autoAssessable: true,
    check: (d: VideoData) => {
      const { tags } = getIG(d);
      if (tags.length >= 3 && tags.length <= 5) return 1;
      if (tags.length >= 1 && tags.length <= 7) return 0.5;
      return 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const { tags } = getIG(d);
      if (score === 1)
        return `${tags.length} hashtags. Optimal. Instagram 2026 treats hashtags as topic signals for the AI classifier, not as discovery channels. 3-5 specific tags categorise the post correctly. More is not better; stuffed posts are filtered.`;
      if (score === 0.5)
        return `${tags.length} hashtags. Adjust to 3-5 niche-specific tags. Hashtags no longer support follows and their discovery impact has diminished since 2024. They're a supporting signal only.`;
      return `No hashtags or too many. Use 3-5 targeted tags that match the topic of the post. Over-tagging triggers the spam classifier.`;
    },
  },
  {
    id: "ig-trial-reel",
    label: "Trial Reels used for experimentation",
    weight: 4,
    tier: 3,
    autoAssessable: false,
    check: (_d: VideoData) => null,
    rationale: (_d: VideoData, _score: number | null) =>
      "Cannot assess from post-hoc data. Instagram 2026 offers Trial Reels: test experimental content with non-followers ONLY before exposing it to your existing audience. If it performs well with the test group, publish to followers. If it flops, it doesn't drag your account's engagement baseline. Use Trial Reels for any content that departs from your niche.",
  },

  // ─── TIER 4: Baseline (8 points) ─────────────────────────────────────────

  {
    id: "ig-engagement-velocity",
    label: "First 30-60 min engagement velocity",
    weight: 3,
    tier: 4,
    autoAssessable: false,
    check: (_d: VideoData) => null,
    rationale: (_d: VideoData, _score: number | null) =>
      "Cannot assess from post-hoc data. Engagement accumulating in the first 30-60 minutes determines whether the Reel clears the audition phase and expands to broader non-follower pools. Reply to every DM/comment in the first hour. Post when your audience is most active (Instagram Insights → Most Active Times).",
  },
  {
    id: "ig-eligibility-criteria",
    label: "Recommendation eligibility  (no violations)",
    weight: 3,
    tier: 4,
    autoAssessable: false,
    check: (_d: VideoData) => null,
    rationale: (_d: VideoData, _score: number | null) =>
      "Instagram 2026 baseline recommendation eligibility: no watermarks from other platforms (TikTok/CapCut logos), includes audio, under 3 minutes, original content. Violating any one disqualifies from Explore and Reels recommendations (content still visible to followers but not to new audiences). Check Account Status in Settings for any active flags.",
  },
  {
    id: "ig-your-algorithm",
    label: "\"Your Algorithm\" topic alignment",
    weight: 2,
    tier: 4,
    autoAssessable: false,
    check: (_d: VideoData) => null,
    rationale: (_d: VideoData, _score: number | null) =>
      "Cannot directly measure. Since December 2025, Instagram users can add/remove topics from their Reel recommendations via Settings → Content Preferences → Your Algorithm. Post within one consistent topic so your content matches the categories users have opted into. Topic drift reduces match rate with opted-in audiences.",
  },
];
