import type { VideoData, VRSCriterion } from "./types";

// X (Twitter) Readiness Score (XRS): 20 criteria, 100 points total
// Signal weights from X's open-sourced algorithm (github.com/twitter/the-algorithm, 2023)
// Updated with 2026 changes: Grok AI ranking, link suppression intensified, Premium reach gap.
//
// Key confirmed weights (from source code):
//   Reply that gets author reply back: +75 (150× a like)
//   Quote tweet:                       +25 (50× a like)
//   Reply:                             +13.5 (27× a like)
//   Profile click → follow:            +12
//   Bookmark:                          +10 (20× a like)
//   Retweet:                           +1 (2× a like)
//   Like:                              +0.5 (baseline)
//   External link in main post:        −75 (NEGATIVE)

// Helper — X posts come in as VideoData but with different fields
function getX(d: VideoData) {
  return {
    reposts:   (d as unknown as { reposts?: number }).reposts ?? (d.shares ?? 0),
    quotes:    (d as unknown as { quotes?: number }).quotes   ?? 0,
    bookmarks: (d as unknown as { bookmarks?: number }).bookmarks ?? (d.saves ?? 0),
    replies:   d.comments,
    likes:     d.likes,
    views:     d.views,
    hasLink:   (d as unknown as { hasLink?: boolean }).hasLink ?? false,
    isThread:  (d as unknown as { isThread?: boolean }).isThread ?? false,
    hasVideo:  (d as unknown as { hasVideo?: boolean }).hasVideo ?? false,
    hasImage:  (d as unknown as { hasImage?: boolean }).hasImage ?? false,
  };
}

export const X_CRITERIA: VRSCriterion[] = [

  // ─── TIER 1: Critical (50 points) ────────────────────────────────────────────

  {
    id: "x-reply-depth",
    label: "Reply depth  (27× a like in X algorithm)",
    weight: 18,
    tier: 1,
    autoAssessable: true,
    check: (d: VideoData) => {
      const { replies, views } = getX(d);
      if (views === 0) return 0;
      const replyRate = (replies / views) * 100;
      return replyRate >= 0.5 ? 1 : replyRate >= 0.15 ? 0.5 : 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const { replies, views } = getX(d);
      const rate = views > 0 ? ((replies / views) * 100).toFixed(3) : "0";
      if (score === 1)
        return `Reply rate ${rate}% → strong. Replies score 27× a like in X's open-source algorithm. A reply that draws the author back (author replies to a reply) scores +75 — 150× a like. This content is generating conversation, which X actively amplifies.`;
      if (score === 0.5)
        return `Reply rate ${rate}% → moderate. To increase: ask a specific, controversial, or unanswerable-in-one-word question in the post. Contrarian takes that invite correction generate the highest reply counts on X.`;
      return `Reply rate ${rate}% → weak. Replies carry 27× the algorithmic weight of a like on X. Content that states a position rather than just shares information generates replies. Add a debatable claim or direct question.`;
    },
  },
  {
    id: "x-quote-rate",
    label: "Quote tweet rate  (50× a like)",
    weight: 15,
    tier: 1,
    autoAssessable: true,
    check: (d: VideoData) => {
      const { quotes, views } = getX(d);
      if (views === 0) return 0;
      const qr = (quotes / views) * 100;
      return qr >= 0.2 ? 1 : qr >= 0.05 ? 0.5 : 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const { quotes, views } = getX(d);
      const rate = views > 0 ? ((quotes / views) * 100).toFixed(4) : "0";
      if (score === 1)
        return `Quote rate ${rate}% → excellent. Quote tweets score 50× a like in X's algorithm — the second-highest action. This content is so compelling or controversial that people quote it with their own commentary. That commentary creates new distribution threads.`;
      if (score === 0.5)
        return `Quote rate ${rate}% → moderate. Quote-worthy content is typically: a data point that surprises people, a take they disagree with strongly enough to publicly respond, or a format they want to remix.`;
      return `Quote rate ${rate}% → weak. Quote tweets score 50× a like. The highest-performing X content creates a "response frame" — people feel compelled to add their own take. Post takes that invite a "well actually" response.`;
    },
  },
  {
    id: "x-bookmark-rate",
    label: "Bookmark rate  (20× a like, utility signal)",
    weight: 10,
    tier: 1,
    autoAssessable: true,
    check: (d: VideoData) => {
      const { bookmarks, views } = getX(d);
      if (views === 0) return 0;
      const br = (bookmarks / views) * 100;
      return br >= 0.5 ? 1 : br >= 0.1 ? 0.5 : 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const { bookmarks, views } = getX(d);
      const rate = views > 0 ? ((bookmarks / views) * 100).toFixed(3) : "0";
      if (score === 1)
        return `Bookmark rate ${rate}% → strong. Bookmarks score 20× a like and signal lasting utility — content people intend to return to. Threads, frameworks, and reference content earn the most bookmarks. This content has "save for later" value.`;
      if (score === 0.5)
        return `Bookmark rate ${rate}% → moderate. Add one high-utility element: a specific number, a checklist, a step-by-step framework, or a comparison table. Content that is too broad to memorise gets bookmarked.`;
      return `Bookmark rate ${rate}% → weak. Bookmarks signal reference value and score 20× a like. Include one piece of specific, dense information that people will want to find again.`;
    },
  },
  {
    id: "x-no-link-in-body",
    label: "No external link in post body  (links score −75)",
    weight: 7,
    tier: 1,
    autoAssessable: true,
    check: (d: VideoData) => {
      const { hasLink } = getX(d);
      // If hasLink is true AND engagement is still high, partial credit (link may be native media)
      if (!hasLink) return 1;
      const likeRate = d.likes / Math.max(1, d.views) * 100;
      return likeRate >= 2 ? 0.5 : 0; // high engagement despite link = partial
    },
    rationale: (d: VideoData, score: number | null) => {
      const { hasLink } = getX(d);
      if (!hasLink || score === 1)
        return `No external link detected in post body → optimal. X's algorithm applies a −75 score penalty (equivalent to removing 150 likes worth of value) for external links in the main post. Always put links in the first reply, not the post itself.`;
      if (score === 0.5)
        return `External link detected but engagement is still strong — suggests the link may be native X media. If this is an external URL (to an article, YouTube video, etc.): move it to the first reply immediately. The −75 penalty is real-time and suppresses distribution from the moment the post is published.`;
      return `External link in post body → significant reach penalty. X's open-source algorithm applies −75 points for external links — equivalent to losing 150 likes worth of distribution. Delete and repost without the link, adding it as the first reply instead.`;
    },
  },

  // ─── TIER 2: Strong Signals (30 points) ──────────────────────────────────────

  {
    id: "x-repost-rate",
    label: "Repost rate  (2× a like)",
    weight: 8,
    tier: 2,
    autoAssessable: true,
    check: (d: VideoData) => {
      const { reposts, views } = getX(d);
      if (views === 0) return 0;
      const rr = (reposts / views) * 100;
      return rr >= 0.5 ? 1 : rr >= 0.15 ? 0.5 : 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const { reposts, views } = getX(d);
      const rate = views > 0 ? ((reposts / views) * 100).toFixed(3) : "0";
      if (score === 1)
        return `Repost rate ${rate}% → strong. While reposts only score 2× a like, volume reposts create secondary distribution waves across other follower graphs. They compound with reply and quote rates.`;
      if (score === 0.5)
        return `Repost rate ${rate}% → moderate. Add a repost-worthy frame: a single insight that stands alone without context, a surprising statistic, or a position statement that needs no explanation to be shared.`;
      return `Repost rate ${rate}% → weak. Repostable content is typically a single standalone insight or take. If reading the post requires the surrounding thread to make sense, people don't repost.`;
    },
  },
  {
    id: "x-first-hour",
    label: "First-hour engagement velocity  (6-hour decay)",
    weight: 8,
    tier: 2,
    autoAssessable: true,
    check: (d: VideoData) => {
      // X posts lose 50% of visibility score every 6 hours (time decay from open-source)
      const ageMs  = d.publishedAt ? Date.now() - new Date(d.publishedAt).getTime() : 999 * 86400000;
      const ageDays= ageMs / 86400000;
      const velocity = (d.likes + d.comments + (d.shares ?? 0)) / Math.max(1, d.views) * 100;
      if (velocity >= 2 && ageDays <= 1) return 1;
      if (velocity >= 1 || ageDays <= 1) return 0.5;
      return 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const velocity = ((d.likes + d.comments + (d.shares ?? 0)) / Math.max(1, d.views) * 100).toFixed(2);
      const ageMs   = d.publishedAt ? Date.now() - new Date(d.publishedAt).getTime() : 0;
      const ageDays = (ageMs / 86400000).toFixed(1);
      if (score === 1)
        return `${velocity}% engagement rate, ${ageDays} days old → strong first-hour velocity. X's time decay function halves visibility score every 6 hours. A post that gets 80% of its total engagement in the first 2 hours is the ideal X distribution pattern.`;
      if (score === 0.5)
        return `${velocity}% engagement, ${ageDays} days old → moderate. Post when your audience is most active. Engage with every reply in the first 30 minutes — each reply you generate adds back to the engagement score.`;
      return `${velocity}% engagement → weak velocity. X is a 6-hour platform — if a post doesn't ignite in the first 6 hours, 95% of its potential reach is gone. Reply to every comment immediately.`;
    },
  },
  {
    id: "x-thread-format",
    label: "Thread or long-form post format",
    weight: 7,
    tier: 2,
    autoAssessable: true,
    check: (d: VideoData) => {
      const { isThread } = getX(d);
      const text = d.description || d.title || "";
      const isLong = text.length > 200;
      if (isThread || isLong) return 1;
      if (text.length > 100) return 0.5;
      return 0.25; // short posts can still perform, just lower ceiling
    },
    rationale: (d: VideoData, score: number | null) => {
      const { isThread } = getX(d);
      if (score === 1)
        return `${isThread ? "Thread detected" : "Long-form post"} → optimal format for X. Threads outperform single posts for educational content because each reply in the thread gets its own impression count. X's algorithm also rewards dwell time — longer content that holds attention scores higher.`;
      if (score === 0.5)
        return `Post length is moderate. For prop trading content, threads work best for: step-by-step breakdowns, challenge progress updates (each day = one post in thread), and educational rule explanations. Single posts work best for: strong one-liner takes and data reveals.`;
      return `Short post format. Single posts can go viral on X if the take is strong enough, but threads generate more reply depth, more bookmark rate, and more dwell time — all higher-weight signals than likes.`;
    },
  },
  {
    id: "x-visual-content",
    label: "Native image or video (no platform watermarks)",
    weight: 7,
    tier: 2,
    autoAssessable: true,
    check: (d: VideoData) => {
      const { hasVideo, hasImage } = getX(d);
      // Native media is rewarded; cross-platform watermarks are penalised
      if (hasVideo || hasImage) return 0.75; // can't fully assess watermark status
      return 0.3; // text-only is fine on X but visual content gets more impressions
    },
    rationale: (d: VideoData, score: number | null) => {
      const { hasVideo, hasImage } = getX(d);
      if (hasVideo || hasImage)
        return `Native ${hasVideo ? "video" : "image"} detected → good. Visual content on X typically gets 2-3× more impressions than text-only posts. Important: never cross-post video with TikTok or Instagram watermarks — X detects and suppresses third-party branded content.`;
      return `Text-only post. X text posts can outperform visual posts when the take is strong enough — X is the only major platform where text consistently beats video. However, a chart, screenshot of data, or native video adds impressions. Native beats cross-posted.`;
    },
  },

  // ─── TIER 3: Supporting Signals (15 points) ──────────────────────────────────

  {
    id: "x-hook-strength",
    label: "First-line hook (bold claim, question, or number)",
    weight: 6,
    tier: 3,
    autoAssessable: true,
    check: (d: VideoData) => {
      const text = (d.description || d.title || "").trim();
      const firstLine = text.split("\n")[0] || text.slice(0, 140);
      const hasNumber  = /\d/.test(firstLine.slice(0, 60));
      const hasQ       = /\?/.test(firstLine);
      const hasBold    = /\b(never|always|stop|this|unpopular|hot take|controversial|nobody|everyone|most)/i.test(firstLine);
      const hasDataHook= /\$|%|×|\d+[kKmM]|#\d/.test(firstLine);
      if ((hasNumber || hasDataHook) && (hasQ || hasBold)) return 1;
      if (hasNumber || hasDataHook || hasQ || hasBold) return 0.75;
      return 0.25;
    },
    rationale: (d: VideoData, score: number | null) => {
      const firstLine = (d.description || d.title || "").split("\n")[0]?.slice(0, 100) ?? "";
      if (score === 1)
        return `First line "${firstLine}" → strong hook. The first line on X is the entire post for most users (they don't click "read more"). Numbers + question or contrarian framing = highest dwell-time hook combination on X.`;
      if (score !== null && score >= 0.75)
        return `First line "${firstLine}" → good hook element detected. Optimal first-line formula: [Number/Data] + [Bold Claim] + [Implicit question]. Example: "97% of prop traders fail in month 1. Here's the one thing I did differently."`;
      return `First line "${firstLine}" → weak hook. The first 140 characters are everything on X — it's all most users see before deciding to expand. Lead with a number, a surprising data point, or a contrarian claim that demands an explanation.`;
    },
  },
  {
    id: "x-hashtag-minimal",
    label: "Hashtags: 0–2 (more = spam signal on X)",
    weight: 5,
    tier: 3,
    autoAssessable: true,
    check: (d: VideoData) => {
      const tags = d.tags?.length ?? 0;
      return tags <= 2 ? 1 : tags <= 4 ? 0.5 : 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const tags = d.tags?.length ?? 0;
      if (score === 1)
        return `${tags} hashtag${tags === 1 ? "" : "s"} → optimal. X's 2026 algorithm downgrades posts with multiple hashtags by 40% — they trigger a spam classifier. 0–2 targeted hashtags is the maximum. #forex and #proptrading are sufficient for niche targeting.`;
      if (score === 0.5)
        return `${tags} hashtags → acceptable but borderline. X treats 3+ hashtags as a spam signal. Reduce to 2 maximum. Topic classification on X comes from NLP of the post text, not hashtags — they are less useful here than on Instagram or TikTok.`;
      return `${tags} hashtags → spam signal. Multiple hashtags actively reduce reach on X by ~40% in 2026. Remove all but the 1–2 most relevant. X's Grok AI reads the post content for topic classification — hashtags are not the discovery mechanism here.`;
    },
  },
  {
    id: "x-like-rate",
    label: "Like rate  (baseline signal — lowest weight)",
    weight: 4,
    tier: 3,
    autoAssessable: true,
    check: (d: VideoData) => {
      const lr = d.likes / Math.max(1, d.views) * 100;
      return lr >= 2 ? 1 : lr >= 0.5 ? 0.5 : 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const lr = (d.likes / Math.max(1, d.views) * 100).toFixed(3);
      if (score === 1)
        return `Like rate ${lr}% → strong. Note: likes are the WEAKEST signal on X (0.5 points vs 27 points for a reply). High likes with low replies indicates content people appreciate but don't engage with — pleasant but not distribution-driving.`;
      if (score === 0.5)
        return `Like rate ${lr}% → moderate. Likes are useful as a baseline engagement health check but carry the least algorithmic weight on X. If likes are high but replies and quote tweets are low, the content is too "agreeable" — add a more provocative element.`;
      return `Like rate ${lr}% → weak. On X, a weak like rate combined with weak reply rate suggests the content isn't resonating with any signal. However: the correct fix is to increase replies and quote tweets, not likes — they carry 27-50× more weight.`;
    },
  },

  // ─── TIER 4: Baseline Signals (5 points) ─────────────────────────────────────

  {
    id: "x-post-timing",
    label: "Posted during 6-hour peak window",
    weight: 3,
    tier: 4,
    autoAssessable: false,
    check: (_d: VideoData) => null,
    rationale: (_d: VideoData, _score: number | null) =>
      "Cannot assess from metadata. X posts lose 50% of visibility score every 6 hours. The entire lifespan of a post is effectively its first 6 hours. Post when your audience is active — check X Analytics → Audience → Active Hours. For global finance audiences: 8–10 AM EST and 12–2 PM EST are typically highest-activity windows.",
  },
  {
    id: "x-author-reply",
    label: "Author replied to replies (150× a like signal)",
    weight: 2,
    tier: 4,
    autoAssessable: false,
    check: (_d: VideoData) => null,
    rationale: (_d: VideoData, _score: number | null) =>
      "Cannot assess from metadata. A reply that gets the original author to reply back scores +75 in X's algorithm — 150× the value of a like. This is the single highest-weight action on the platform. Brief creators: reply to EVERY comment in the first 30 minutes. One back-and-forth reply chain is worth more algorithmically than 150 likes.",
  },
];
