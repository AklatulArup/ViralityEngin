import type { VideoData, VRSCriterion } from "./types";

// YouTube Shorts SRS: 20 criteria, 100 points
// Formula: (V_vs*0.50) + (Loop*0.30) + (ExtShares*0.20)
// No 48hr virality cap in 2026. Frame 1 IS the thumbnail.
// Sources: YT Creator Insider 2025, no-cap announcement 2024, platform research
// NOTE: All checks use only VideoData fields (views, likes, comments, shares, saves, durationSeconds)

function engProxy(d: VideoData): number {
  return ((d.likes + d.comments) / Math.max(1, d.views)) * 100;
}
function shareRate(d: VideoData): number {
  return ((d.shares ?? 0) / Math.max(1, d.views)) * 100;
}
function likeRate(d: VideoData): number {
  return (d.likes / Math.max(1, d.views)) * 100;
}

export const YT_SHORTS_CRITERIA: VRSCriterion[] = [

  // TIER 1: Critical (50 pts)

  { id:"yts-frame1", label:"Frame 1 Pattern Interrupt  (V_vs gate — >30% swipe = PERMANENT death)",
    weight:18, tier:1, autoAssessable:false,
    check:(_d:VideoData) => null,
    rationale:() => "Cannot assess from metadata. Frame 1 IS the thumbnail for Shorts. Viewed-vs-swiped (V_vs) = 50% of formula. Kill threshold: >30% swipe-away = PERMANENT burial, no recovery. Open on most striking visual: payout number, chart spike, funded cert. Zero intros, logos, or slow zooms."},

  { id:"yts-completion", label:"Completion Rate  (>=70% gate)",
    weight:15, tier:1, autoAssessable:true,
    check:(d:VideoData) => {
      const dur = d.durationSeconds, eng = engProxy(d);
      const isSh = dur <= 60, isExp = dur <= 180;
      if (isSh && eng >= 5) return 1;
      if (isSh && eng >= 3) return 0.75;
      if (isExp && eng >= 5) return 0.75;
      if (isExp && eng >= 3) return 0.5;
      return 0.25;
    },
    rationale:(d:VideoData, score:number|null) => {
      const dur = d.durationSeconds, ds = `${dur}s`, eng = engProxy(d).toFixed(1);
      if (score !== null && score >= 0.75) return `${ds} + ${eng}% eng proxy -> strong completion signal. >=70% completion required to pass Step 1 distribution. Short duration makes completion mechanically easier.`;
      if (score !== null && score >= 0.5) return `${ds} + ${eng}% eng proxy -> moderate. Every second of padding costs completion rate. Target 15-30s sweet spot.`;
      return `${ds} + ${eng}% eng proxy -> weak. Completion is the primary driver after the V_vs swipe gate. Cut to 15-30s - remove any padded intro, slow buildup, or outro.`;
    }},

  { id:"yts-no-watermark", label:"No Third-Party Watermark  (Zero tolerance)",
    weight:10, tier:1, autoAssessable:false,
    check:(_d:VideoData) => null,
    rationale:() => "Cannot assess from metadata. YouTube fingerprints every upload. TikTok/CapCut watermarks = immediate demotion from Shorts feed. Permanent - the video will not recover. Export clean before uploading. Never save from TikTok and re-upload."},

  { id:"yts-loop-rate", label:"Loop / Rewatch Rate  (Natural loop design, 30% formula weight)",
    weight:7, tier:1, autoAssessable:false,
    check:(_d:VideoData) => null,
    rationale:() => "Cannot assess from metadata. YouTube identifies natural loops - videos where last frame flows seamlessly back to the first. Loop rate = 30% of the Shorts formula. Design rule: no thanks-for-watching, no fade-out, no outro music. Cut directly back to Frame 1. One viewer watching 3x beats three viewers watching once."},

  // TIER 2: Strong (30 pts)

  { id:"yts-external-share", label:"External Shares  (WhatsApp/Discord, 20% formula weight)",
    weight:12, tier:2, autoAssessable:true,
    check:(d:VideoData) => {
      const sr = shareRate(d);
      return sr >= 0.5 ? 1 : sr >= 0.1 ? 0.5 : 0;
    },
    rationale:(d:VideoData, score:number|null) => {
      const sr = shareRate(d).toFixed(3);
      if (score === 1)  return `Share rate ${sr}% -> strong. External shares (WhatsApp, iMessage, Discord, Telegram) carry highest external-share weight of all 4 platforms on Shorts. YouTube tracks off-platform sharing as proof of genuine value.`;
      if (score === 0.5) return `Share rate ${sr}% -> moderate. After posting: share the link directly to a trading Discord/WhatsApp. Even 5-10 genuine external shares in first 90 min makes a measurable algorithmic difference.`;
      return `Share rate ${sr}% -> weak. External shares = 20% of formula. CTA: "Share this to your trading group" - name the specific group. Named destination outperforms generic "share this."`;
    }},

  { id:"yts-evergreen", label:"Evergreen Potential  (No 48hr cap, SEO title)",
    weight:8, tier:2, autoAssessable:true,
    check:(d:VideoData) => {
      const hasSEO = /how|why|what|best|tips|guide|rules|explained|tutorial|review/i.test(d.title ?? "");
      const hasNum = /\d/.test((d.title ?? "").slice(0, 20));
      return (hasSEO && hasNum) ? 1 : (hasSEO || hasNum) ? 0.5 : 0.25;
    },
    rationale:(d:VideoData, score:number|null) => {
      if (score === 1) return `Title "${d.title}" -> strong SEO signals. YouTube Shorts has no 48hr cap in 2026. Search-optimised title creates a view stream that persists indefinitely alongside Shorts feed distribution.`;
      if (score !== null && score >= 0.5) return `Title has some SEO value. Add specific search phrase: "how to pass fundednext challenge", "prop firm challenge tips". Speak keyword in first 5s for dual audio+title indexing.`;
      return `Title has limited SEO. Include a searchable keyword phrase to unlock the search surface. A well-titled Short about "FundedNext drawdown rules" earns search traffic indefinitely.`;
    }},

  { id:"yts-longform-bridge", label:"Long-Form Bridge  (Shorts -> LF = compound signal)",
    weight:5, tier:2, autoAssessable:false,
    check:(_d:VideoData) => null,
    rationale:() => "Cannot assess from metadata. Most powerful compound signal on Shorts: viewers clicking to Long-Form channel. Bridges two separate algorithmic surfaces. CTA: 'Full breakdown in my latest video - link in description.' YouTube tracks Shorts-to-LF clicks as high-value session contribution."},

  { id:"yts-subscribe", label:"Subscribe  (Series context only)",
    weight:5, tier:2, autoAssessable:false,
    check:(_d:VideoData) => null,
    rationale:() => "Cannot assess from metadata. Subscribe CTAs work on Shorts only in Day N series context. Generic subscribe CTAs placed too early signal 'video ending' to viewer and hurt completion rate. Never use on standalone Shorts."},

  // TIER 3: Supporting (15 pts)

  { id:"yts-duration", label:"Duration  (15-30s sweet spot)",
    weight:6, tier:3, autoAssessable:true,
    check:(d:VideoData) => {
      const dur = d.durationSeconds;
      return (dur >= 15 && dur <= 30) ? 1 : (dur >= 10 && dur <= 60) ? 0.75 : dur <= 180 ? 0.5 : 0;
    },
    rationale:(d:VideoData, score:number|null) => {
      const dur = d.durationSeconds;
      if (score === 1) return `${dur}s -> optimal. 15-30s maximises completion rate while providing enough time for a compelling narrative.`;
      if (score !== null && score >= 0.75) return `${dur}s -> good. Within workable Shorts range. Consider whether anything can be trimmed - every second of padding costs completion rate.`;
      return `${dur}s -> outside optimal. ${dur > 60 ? "Over 60s faces higher completion hurdles. Consider Long-Form instead." : "Under 15s may lack enough context. Test 20-25s as the floor for trading content."}`;
    }},

  { id:"yts-seo-title", label:"SEO Title  (Search-indexed like Long-Form titles)",
    weight:5, tier:3, autoAssessable:true,
    check:(d:VideoData) => {
      const t = d.title ?? "", len = t.length;
      const hasKW = /how|why|what|best|tips|guide|rules|explained|fundednext|prop|funded|trader|trading/i.test(t);
      const goodLen = len >= 30 && len <= 70;
      return (hasKW && goodLen) ? 1 : (hasKW || goodLen) ? 0.5 : 0.25;
    },
    rationale:(d:VideoData, score:number|null) => {
      const len = (d.title ?? "").length;
      if (score === 1) return `Title "${d.title}" (${len} chars) -> SEO-optimised. YouTube indexes Shorts titles for search alongside Long-Form titles. Creates search-driven views that compound indefinitely.`;
      if (score !== null && score >= 0.5) return `Title has partial SEO value. Include exact search phrase: "how to pass fundednext", "prop firm challenge tips". Speak phrase in first 5s for dual indexing.`;
      return `Title needs SEO optimisation. Include a specific searchable keyword phrase to unlock the search distribution surface beyond the Shorts feed.`;
    }},

  { id:"yts-hashtags", label:"#Shorts Classification + Niche Hashtags",
    weight:4, tier:3, autoAssessable:true,
    check:(d:VideoData) => {
      const tags = d.tags ?? [], title = d.title ?? "";
      const hasSh = /shorts?/i.test(title) || tags.some((t:string) => /shorts?/i.test(t));
      const hasNiche = tags.some((t:string) => /trading|forex|prop|funded|trader/i.test(t));
      return (hasSh && hasNiche) ? 1 : (hasSh || hasNiche) ? 0.5 : 0;
    },
    rationale:(d:VideoData, score:number|null) => {
      if (score === 1) return `#Shorts + niche hashtags detected -> optimal. YouTube uses #Shorts for feed classification and niche hashtags for interest matching. Both needed for full distribution.`;
      if (score !== null && score >= 0.5) return `Partial hashtag coverage. Include #Shorts for feed classification AND 2-3 niche hashtags (#proptrading, #fundedtrader) for interest-matched distribution.`;
      return `Missing #Shorts classification. Without #Shorts in title or description, YouTube may not show this in the Shorts feed. Add #Shorts + 2-3 niche hashtags.`;
    }},

  // TIER 4: Baseline (5 pts)

  { id:"yts-post-timing", label:"External Share Timing  (Within 90 min of posting)",
    weight:3, tier:4, autoAssessable:false,
    check:(_d:VideoData) => null,
    rationale:() => "Cannot assess from metadata. Share the link to WhatsApp/Discord IMMEDIATELY after posting to seed the external share signal within the first 90 minutes of the Step 1 distribution test. Unlike TikTok, timing is less critical for the algorithmic window itself."},

  { id:"yts-pinned-comment", label:"Pinned Comment  (CTA + keywords within 1hr)",
    weight:2, tier:4, autoAssessable:false,
    check:(_d:VideoData) => null,
    rationale:() => "Cannot assess from metadata. Pin a comment within 1 hour of publishing: (1) FundedNext link or relevant CTA, (2) a question that drives replies, (3) additional keywords not in the title. YouTube tracks pinned comment engagement as part of the overall video engagement score."},
];
