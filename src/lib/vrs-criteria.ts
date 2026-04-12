import type { VideoData, VRSCriterion } from "./types";

// YouTube Long-Form VRS: 20 criteria, 100 points total
// 16 auto-assessable via direct data + proxy estimation
// 4 hidden (thumbnail packaging, mobile thumb, visual promise, audio quality)

export const YT_LONGFORM_CRITERIA: VRSCriterion[] = [
  // ─── TIER 1: Critical (50 points) ───
  {
    id: "satisfaction",
    label: "Viewer Satisfaction",
    weight: 12,
    tier: 1,
    autoAssessable: true,
    check: (d: VideoData) => {
      const ratio = (d.likes / (d.views || 1)) * 100;
      return ratio >= 4 ? 1 : ratio >= 2 ? 0.5 : 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const ratio = (d.likes / (d.views || 1)) * 100;
      if (score === 1)
        return `Like/view ratio is ${ratio.toFixed(2)}% (>=4% threshold). Strong viewer satisfaction — the audience actively endorses this content.`;
      if (score === 0.5)
        return `Like/view ratio is ${ratio.toFixed(2)}% (2-4% range). Moderate satisfaction — decent but not exceptional audience approval.`;
      return `Like/view ratio is ${ratio.toFixed(2)}% (<2%). Low satisfaction signal — viewers are watching but not endorsing. Check if content delivers on the title promise.`;
    },
  },
  {
    id: "retention",
    label: "Watch Time & Retention",
    weight: 11,
    tier: 1,
    autoAssessable: true,
    check: (d: VideoData) => {
      // Proxy: engagement intensity × duration optimization
      // High engagement on longer videos = strong retention
      const engRate = (d.likes + d.comments) / (d.views || 1) * 100;
      const durMin = d.durationSeconds / 60;
      const optimalDuration = durMin >= 8 && durMin <= 25;
      const decentDuration = durMin >= 3 && durMin <= 45;

      if (engRate >= 5 && optimalDuration) return 1;
      if (engRate >= 3 && decentDuration) return 0.5;
      if (engRate >= 5 && decentDuration) return 0.5;
      return 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const engRate = ((d.likes + d.comments) / (d.views || 1) * 100).toFixed(2);
      const durMin = (d.durationSeconds / 60).toFixed(1);
      const basis = `Proxy: engagement rate ${engRate}% × duration ${durMin}min.`;
      if (score === 1)
        return `${basis} Strong retention signal — high engagement on optimally-timed content indicates viewers are watching through and interacting. Videos with >5% engagement in the 8-25min sweet spot consistently show flat retention curves.`;
      if (score === 0.5)
        return `${basis} Moderate retention signal — either engagement or duration is suboptimal. For better retention: front-load value, use pattern interrupts every 2-3 minutes, and keep within the 8-25 minute sweet spot.`;
      return `${basis} Weak retention signal — low engagement suggests viewers aren't staying through the video. Consider: stronger opening hook, tighter editing, and reducing dead time.`;
    },
  },
  {
    id: "hook",
    label: "Hook (first 7-15s)",
    weight: 9,
    tier: 1,
    autoAssessable: true,
    check: (d: VideoData) => {
      // Proxy: if CTR proxy is high (good velocity) AND engagement stays strong,
      // hook is working. If views high but engagement low = clickbait (weak hook retention).
      const engRate = (d.likes + d.comments) / (d.views || 1) * 100;
      const ctx = d.channelContext;
      const viewsVsSubs = ctx?.subs ? d.views / ctx.subs : 0;

      // Title-level hook signals
      const title = d.title.toLowerCase();
      const hasHookPattern = /^(how|why|i |this|the secret|the truth|what happens|watch|stop)/i.test(d.title)
        || /\?/.test(d.title)
        || /\d/.test(title.slice(0, 10));

      // Strong hook = people clicked (high velocity) AND stayed (high engagement)
      if (viewsVsSubs >= 0.3 && engRate >= 4 && hasHookPattern) return 1;
      if ((viewsVsSubs >= 0.1 && engRate >= 3) || (engRate >= 5 && hasHookPattern)) return 0.5;
      // High views but low engagement = clickbait hook (got clicks, lost retention)
      if (viewsVsSubs >= 0.5 && engRate < 2) return 0;
      return engRate >= 3 ? 0.5 : 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const engRate = ((d.likes + d.comments) / (d.views || 1) * 100).toFixed(2);
      const ctx = d.channelContext;
      const vvs = ctx?.subs ? (d.views / ctx.subs).toFixed(2) : "N/A";
      const basis = `Proxy: views/subs ratio ${vvs} × engagement ${engRate}%.`;
      if (score === 1)
        return `${basis} Strong hook signal — viewers clicked AND stayed engaged. The title/thumbnail promise was delivered in the first 7-15 seconds. This is the #1 retention driver.`;
      if (score === 0.5)
        return `${basis} Moderate hook — either click-through or retention is weaker. The first 7-15 seconds should deliver an immediate value proposition, pattern interrupt, or open loop.`;
      return `${basis} Weak hook signal — viewers are either not clicking or bouncing early. The opening needs: direct eye contact, immediate statement of value, or a visual pattern interrupt within the first 3 seconds.`;
    },
  },
  {
    id: "ctr",
    label: "CTR Quality Click Ratio",
    weight: 9,
    tier: 1,
    autoAssessable: true,
    check: (d: VideoData) => {
      // Proxy: views relative to subscriber count = CTR effectiveness
      // High views/subs means the title+thumbnail package drove clicks
      const ctx = d.channelContext;
      if (!ctx?.subs) return null; // Can't estimate without subs
      const ratio = d.views / ctx.subs;
      if (ratio >= 0.5) return 1;   // 50%+ of subs viewed = excellent CTR
      if (ratio >= 0.1) return 0.5;  // 10-50% = decent
      return 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const ctx = d.channelContext;
      if (score === null)
        return "CTR estimation requires subscriber count. When channel data is available, this compares views to subscriber base as a proxy for click-through rate. 4-6% CTR is average; 8%+ is excellent.";
      const ratio = ctx?.subs ? ((d.views / ctx.subs) * 100).toFixed(1) : "N/A";
      if (score === 1)
        return `Views are ${ratio}% of subscriber base — excellent CTR proxy. The title + thumbnail packaging is compelling enough that a large portion of the audience clicked. YouTube's algorithm heavily weights first-48-hour CTR.`;
      if (score === 0.5)
        return `Views are ${ratio}% of subscriber base — moderate CTR proxy. The packaging is decent but could be stronger. Test: does the thumbnail have a clear emotion + max 3 words of text? Does the title create a curiosity gap?`;
      return `Views are ${ratio}% of subscriber base — low CTR proxy. The thumbnail+title package isn't compelling enough. YouTube gives every video an initial impression pool — low CTR kills distribution early.`;
    },
  },
  {
    id: "retention-structure",
    label: "Retention Structure",
    weight: 9,
    tier: 1,
    autoAssessable: true,
    check: (d: VideoData) => {
      // Proxy: structured content signals from description + duration
      const desc = d.description || "";
      const hasTimestamps = /\d{1,2}:\d{2}/.test(desc);
      const hasChapters = /chapter|section|part \d|step \d/i.test(desc);
      const hasSections = (desc.match(/\n/g) || []).length >= 5;
      const durMin = d.durationSeconds / 60;
      const goodDuration = durMin >= 8 && durMin <= 30;
      const engRate = (d.likes + d.comments) / (d.views || 1) * 100;

      const signals = [
        hasTimestamps,
        hasChapters,
        hasSections,
        goodDuration,
        engRate >= 3,
      ].filter(Boolean).length;

      return signals >= 4 ? 1 : signals >= 2 ? 0.5 : 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const desc = d.description || "";
      const hasTimestamps = /\d{1,2}:\d{2}/.test(desc);
      const hasChapters = /chapter|section|part \d|step \d/i.test(desc);
      const parts: string[] = [];
      if (hasTimestamps) parts.push("has timestamps");
      if (hasChapters) parts.push("has chapter markers");
      if (score === 1)
        return `Well-structured content (${parts.join(", ")}). Good duration with timestamps and chapters create a flat/rising retention curve — YouTube's algorithm rewards this pattern heavily.`;
      if (score === 0.5)
        return `Some structure signals detected (${parts.length > 0 ? parts.join(", ") : "duration and engagement ok"}). Add timestamps and clear sections to create re-engagement peaks in the retention curve.`;
      return `Weak structure signals. No timestamps or chapters detected. Unstructured content causes monotonic retention decline. Add: timestamps, chapter markers, mid-video hooks every 2-3 minutes.`;
    },
  },

  // ─── TIER 2: Strong (28 points) ───
  {
    id: "thumbnail",
    label: "Thumbnail Packaging",
    weight: 8,
    tier: 2,
    autoAssessable: false,
    check: () => null,
    rationale: () =>
      "Requires visual analysis of the thumbnail image. Evaluate: high contrast, readable at mobile size (50px), emotion on face, max 3 words of text, clear visual hierarchy. Thumbnail drives 70%+ of click decisions.",
  },
  {
    id: "title",
    label: "Title Curiosity & Clarity",
    weight: 5,
    tier: 2,
    autoAssessable: true,
    check: (d: VideoData) => {
      const t = d.title || "";
      const hasNumber = /\d/.test(t);
      const hasPowerWord =
        /how|why|secret|truth|best|worst|top|never|always|mistake|hack|trick|proven|exact|real/i.test(t);
      const goodLength = t.length > 15 && t.length < 80;
      if ((hasNumber || hasPowerWord) && goodLength) return 1;
      if (t.length > 10) return 0.5;
      return 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const t = d.title || "";
      const hasNumber = /\d/.test(t);
      const hasPowerWord =
        /how|why|secret|truth|best|worst|top|never|always|mistake|hack|trick|proven|exact|real/i.test(t);
      const parts: string[] = [];
      parts.push(`Title: "${t}" (${t.length} chars)`);
      if (hasNumber) parts.push("contains numbers (boosts CTR)");
      if (hasPowerWord) parts.push("contains power words (boosts curiosity)");
      if (!hasNumber && !hasPowerWord) parts.push("no numbers or power words detected");
      if (score === 1) parts.push("Strong title — combines curiosity triggers with good length.");
      else if (score === 0.5) parts.push("Partial — adequate length but missing curiosity amplifiers (numbers, power words).");
      else parts.push("Weak — too short or missing all engagement triggers.");
      return parts.join(". ");
    },
  },
  {
    id: "comments-ratio",
    label: "Comments / View Ratio",
    weight: 5,
    tier: 2,
    autoAssessable: true,
    check: (d: VideoData) => {
      const ratio = (d.comments / (d.views || 1)) * 100;
      return ratio >= 4 ? 1 : ratio >= 2 ? 0.5 : 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const ratio = (d.comments / (d.views || 1)) * 100;
      if (score === 1)
        return `Comment/view ratio: ${ratio.toFixed(2)}% (${d.comments} comments on ${d.views.toLocaleString()} views). Excellent — active discussion signals deep engagement to the algorithm.`;
      if (score === 0.5)
        return `Comment/view ratio: ${ratio.toFixed(2)}% (${d.comments} comments). Moderate discussion. Add explicit CTAs or pin a question to boost comment activity.`;
      return `Comment/view ratio: ${ratio.toFixed(2)}% (${d.comments} comments). Low discussion. The audience is passive — add questions, polls, or controversial takes to spark comments.`;
    },
  },
  {
    id: "shares",
    label: "Shares & Saves",
    weight: 5,
    tier: 2,
    autoAssessable: true,
    check: (d: VideoData) => {
      // Proxy: high engagement intensity = share-worthy content
      // Videos people share have unusually high like+comment rates
      const engRate = (d.likes + d.comments) / (d.views || 1) * 100;
      // Also check if title has share-triggering patterns
      const sharePatterns = /send this|share|tag someone|show this|must see|mind blown|can't believe/i.test(d.title + " " + (d.description || "").slice(0, 200));
      if (engRate >= 6 || (engRate >= 4 && sharePatterns)) return 1;
      if (engRate >= 3) return 0.5;
      return 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const engRate = ((d.likes + d.comments) / (d.views || 1) * 100).toFixed(2);
      if (score === 1)
        return `Engagement intensity ${engRate}% suggests strong share-worthiness. High-engagement content gets shared organically — shares are the strongest distribution signal after retention.`;
      if (score === 0.5)
        return `Engagement intensity ${engRate}% — moderate share potential. Add "send this to a friend who..." CTAs and create relatable/surprising moments to boost shareability.`;
      return `Engagement intensity ${engRate}% — low share signal. Content needs more share-triggering moments: controversy, surprise, extreme value, or emotional peaks. YouTube doesn't expose share counts via API, but engagement intensity correlates.`;
    },
  },
  {
    id: "session",
    label: "Session Contribution",
    weight: 5,
    tier: 2,
    autoAssessable: true,
    check: (d: VideoData) => {
      // Proxy: optimal duration + description links/playlists + engagement
      const durMin = d.durationSeconds / 60;
      const desc = d.description || "";
      const hasLinks = /youtube\.com|youtu\.be|playlist|watch\?v=|next video/i.test(desc);
      const hasEndScreen = /subscribe|next|watch|playlist|more videos/i.test(desc.slice(-300));
      const goodDuration = durMin >= 8 && durMin <= 25;
      const engRate = (d.likes + d.comments) / (d.views || 1) * 100;

      const signals = [goodDuration, hasLinks, hasEndScreen, engRate >= 3].filter(Boolean).length;
      return signals >= 3 ? 1 : signals >= 2 ? 0.5 : 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const durMin = (d.durationSeconds / 60).toFixed(1);
      if (score === 1)
        return `Strong session signals: ${durMin}min duration with links and engagement CTAs. Videos that keep viewers on YouTube (via end screens, playlists, suggested video links) get boosted in recommendations.`;
      if (score === 0.5)
        return `Moderate session signals. Add end screens, playlist links, and "watch next" suggestions in the description to improve session contribution — YouTube rewards videos that don't end viewing sessions.`;
      return `Weak session signals. Missing: YouTube links in description, end screen CTAs, optimal duration. Videos that end viewing sessions are algorithmically deprioritized.`;
    },
  },

  // ─── TIER 3: Supporting (15 points) ───
  {
    id: "non-sub-reach",
    label: "Non-Subscriber Reach",
    weight: 4,
    tier: 3,
    autoAssessable: true,
    check: (d: VideoData) => {
      // Proxy: views/subs ratio — high ratio means YouTube pushed beyond subscriber base
      const ctx = d.channelContext;
      if (!ctx?.subs) return null;
      const ratio = d.views / ctx.subs;
      if (ratio >= 3) return 1;   // 3x subs = massive non-sub distribution
      if (ratio >= 0.5) return 0.5; // Decent algorithmic reach
      return 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const ctx = d.channelContext;
      if (score === null)
        return "Requires subscriber count to estimate non-subscriber reach. High views relative to subs indicates strong algorithmic distribution to non-subscribers.";
      const ratio = ctx?.subs ? (d.views / ctx.subs).toFixed(1) : "N/A";
      if (score === 1)
        return `Views are ${ratio}x subscriber count — exceptional non-subscriber reach. YouTube is actively recommending this to viewers outside the subscriber base via Browse and Suggested.`;
      if (score === 0.5)
        return `Views are ${ratio}x subscriber count — moderate non-sub reach. Some algorithmic distribution is happening. Stronger thumbnails and titles can amplify recommendation surface.`;
      return `Views are ${ratio}x subscriber count — limited non-sub reach. Most views are likely from subscribers/notifications. Improve CTR and retention to unlock algorithmic distribution.`;
    },
  },
  {
    id: "like-ratio",
    label: "Like-to-Dislike Ratio",
    weight: 3,
    tier: 3,
    autoAssessable: true,
    check: (d: VideoData) => (d.likes > 0 ? 1 : 0),
    rationale: (d: VideoData, score: number | null) => {
      if (score === 1)
        return `${d.likes.toLocaleString()} likes with no visible dislikes (YouTube hid public dislike counts). Positive sentiment signal. Note: dislike data is hidden from API since 2021.`;
      return `No likes recorded. This may indicate the video is very new, or there's an engagement problem.`;
    },
  },
  {
    id: "search-alignment",
    label: "Search & Topic Alignment",
    weight: 3,
    tier: 3,
    autoAssessable: true,
    check: (d: VideoData) => {
      const tagCount = d.tags?.length || 0;
      return tagCount > 3 ? 1 : tagCount > 0 ? 0.5 : 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const tagCount = d.tags?.length || 0;
      if (score === 1)
        return `${tagCount} tags configured. Good topic alignment — helps YouTube classify this content for search and recommendations.`;
      if (score === 0.5)
        return `Only ${tagCount} tag(s). Add more relevant tags (aim for 8-15) to strengthen topic classification and search discoverability.`;
      return `No tags found. YouTube can't effectively classify this content for search. Add 8-15 relevant tags covering main topic, subtopics, and related queries.`;
    },
  },
  {
    id: "series-pattern",
    label: "Series / Archetype Pattern",
    weight: 3,
    tier: 3,
    autoAssessable: true,
    check: (d: VideoData) => {
      const title = d.title;
      const ctx = d.channelContext;

      // Direct series indicators in title
      const isSeries = /part \d|ep\.?\s*\d|episode \d|#\d|vol\.?\s*\d|chapter \d|day \d/i.test(title);
      if (isSeries) return 1;

      // Check for recurring format across recent titles
      if (ctx?.recentVideoTitles && ctx.recentVideoTitles.length >= 3) {
        // Look for consistent naming patterns (e.g., all start with same word, or share a keyword)
        const titleWords = title.toLowerCase().split(/\s+/).slice(0, 3);
        const matchingTitles = ctx.recentVideoTitles.filter((t) =>
          titleWords.some((w) => w.length > 3 && t.toLowerCase().includes(w))
        );
        if (matchingTitles.length >= 2) return 0.5; // Recurring format detected
      }

      return 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      if (score === 1)
        return `Series content detected in title. Series create binge-watching patterns that boost session time — YouTube's algorithm rewards viewers who watch multiple videos in sequence.`;
      if (score === 0.5)
        return `Recurring format detected across channel uploads. Consistent content formats build viewer habits and improve notification click-through rates.`;
      return `No series or recurring format detected. Consider creating series content (numbered episodes, recurring challenges) to boost session time and return viewership.`;
    },
  },
  {
    id: "mobile-thumb",
    label: "Thumbnail Mobile Ready",
    weight: 2,
    tier: 3,
    autoAssessable: false,
    check: () => null,
    rationale: () =>
      "Requires visual analysis. 70%+ of YouTube views are mobile. Test: can you read the thumbnail text and understand the image at 50x28 pixels? If not, simplify it.",
  },

  // ─── TIER 4: Baseline (7 points) ───
  {
    id: "native-format",
    label: "Platform-Native Format",
    weight: 2,
    tier: 4,
    autoAssessable: true,
    check: () => 1,
    rationale: () =>
      "Auto-pass: this is a native YouTube video in standard format. No format penalties applied.",
  },
  {
    id: "promise-alignment",
    label: "Visual Promise Alignment",
    weight: 2,
    tier: 4,
    autoAssessable: false,
    check: () => null,
    rationale: () =>
      "Requires manual review. Does the video deliver what the thumbnail and title promise? Misalignment causes early exits (retention drop) and satisfaction decline — the algorithm's biggest penalty.",
  },
  {
    id: "audio-quality",
    label: "Audio Quality",
    weight: 1.5,
    tier: 4,
    autoAssessable: false,
    check: () => null,
    rationale: () =>
      "Requires listening review. Clear audio is a baseline requirement. Background noise, echo, or low volume cause immediate viewer exits. Invest in a decent microphone before anything else.",
  },
  {
    id: "description-meta",
    label: "Description & Metadata",
    weight: 1,
    tier: 4,
    autoAssessable: true,
    check: (d: VideoData) => {
      const len = d.description?.length || 0;
      return len > 100 ? 1 : len > 20 ? 0.5 : 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const len = d.description?.length || 0;
      if (score === 1)
        return `Description is ${len} characters — well-populated. Good metadata helps YouTube understand content for search and recommendations.`;
      if (score === 0.5)
        return `Description is only ${len} characters. Add more context: timestamps, links, keywords, and a content summary to improve discoverability.`;
      return `Description is ${len} characters — nearly empty. YouTube uses description text for topic classification. Add at minimum 200+ characters with relevant keywords and timestamps.`;
    },
  },
  {
    id: "upload-consistency",
    label: "Upload Consistency",
    weight: 0.5,
    tier: 4,
    autoAssessable: true,
    check: (d: VideoData) => {
      const ctx = d.channelContext;
      if (!ctx?.uploadFrequency) return null;
      const freq = ctx.uploadFrequency;
      // 3-10 days between uploads = consistent
      if (freq >= 3 && freq <= 10) return 1;
      // 10-21 days = somewhat consistent
      if (freq > 10 && freq <= 21) return 0.5;
      return 0;
    },
    rationale: (d: VideoData, score: number | null) => {
      const ctx = d.channelContext;
      if (score === null)
        return "Requires channel upload history to assess consistency. Consistent weekly uploads train the notification algorithm and build subscriber habits.";
      const freq = ctx?.uploadFrequency || 0;
      if (score === 1)
        return `Upload frequency: every ~${freq} days. Consistent schedule — this trains YouTube's notification algorithm and builds viewer habits. Weekly uploads are the sweet spot for most creators.`;
      if (score === 0.5)
        return `Upload frequency: every ~${freq} days. Somewhat irregular — try to tighten to 7-10 day cycles. YouTube rewards consistent creators with better notification delivery.`;
      return `Upload frequency: every ~${freq} days. Inconsistent — long gaps between uploads cause subscriber disengagement and notification algorithm decay. Aim for weekly minimum.`;
    },
  },
];
