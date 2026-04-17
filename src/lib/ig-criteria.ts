import type { VideoData, VRSCriterion } from "./types";

// Instagram Reels IRS: 20 criteria, 100 points
// Formula: (DM_sends*0.40) + (Saves*0.30) + (3s_hold+Watch*0.30)
// Sources: Mosseri Jan 2025, Feb 2026. Platform research 2024-2026.
// NOTE: All checks use only VideoData fields (views, likes, comments, shares, saves, durationSeconds)
// Engagement proxy: (likes + comments) / views * 100

function engProxy(d: VideoData): number {
  return ((d.likes + d.comments) / Math.max(1, d.views)) * 100;
}
function shareRate(d: VideoData): number {
  return ((d.shares ?? 0) / Math.max(1, d.views)) * 100;
}
function saveRate(d: VideoData): number {
  return ((d.saves ?? 0) / Math.max(1, d.views)) * 100;
}
function commentRate(d: VideoData): number {
  return (d.comments / Math.max(1, d.views)) * 100;
}
function likeRate(d: VideoData): number {
  return (d.likes / Math.max(1, d.views)) * 100;
}

export const IG_CRITERIA: VRSCriterion[] = [

  // TIER 1: Critical (50 pts)

  { id:"ig-dm-send", label:"DM Send Rate  (#1 non-follower signal, ~40% weight)",
    weight:15, tier:1, autoAssessable:true,
    check:(d:VideoData) => {
      const sr = shareRate(d), eng = engProxy(d);
      return (sr >= 1.0 || eng >= 6) ? 1 : (sr >= 0.3 || eng >= 3) ? 0.5 : 0;
    },
    rationale:(d:VideoData, score:number|null) => {
      const sr = shareRate(d).toFixed(3), eng = engProxy(d).toFixed(1);
      if (score === 1)  return `Share rate ${sr}% + ${eng}% eng proxy -> strong DM send signal. Mosseri (Jan 2025, Feb 2026): DM sends = #1 signal for non-follower reach (~40% weight). 694K Reels sent via DM every minute on Instagram.`;
      if (score === 0.5) return `Share rate ${sr}% -> moderate. CTA fix: "Send this to whoever is starting a challenge" - naming the specific recipient triples the forward rate vs generic "share this."`;
      return `Share rate ${sr}% -> weak. DM sends carry ~40% of non-follower distribution weight. Content needs a forward-worthy hook. Key test: would someone personally hand this to a specific named person?`;
    }},

  { id:"ig-save-rate", label:"Save Rate  (3x weight of Like, ~30% weight)",
    weight:13, tier:1, autoAssessable:true,
    check:(d:VideoData) => {
      const sv = saveRate(d);
      if (sv >= 2) return 1;
      if (sv >= 0.5) return 0.5;
      return commentRate(d) >= 0.5 ? 0.5 : 0;
    },
    rationale:(d:VideoData, score:number|null) => {
      const sv = saveRate(d).toFixed(3);
      if (score === 1)  return `Save rate ${sv}% -> excellent. Saves are 3x the algorithmic weight of a like. High-save Reels get 2-4 weeks extended shelf life via "Suggested for you" placement.`;
      if (score === 0.5) return `Save rate ${sv}% -> moderate. Embed a rule, number, or formula too dense to memorise. CTA: "Save this before your next challenge."`;
      return `Save rate ~0% -> missing a critical signal. Include specific reference information (rule, number, formula) that viewers will want to return to.`;
    }},

  { id:"ig-3sec-hold", label:"3-Second Hold Rate  (<40% = 5-10x less reach)",
    weight:12, tier:1, autoAssessable:true,
    check:(d:VideoData) => {
      const eng = engProxy(d), lr = likeRate(d);
      // High like rate + high comment rate = strong hold proxy (people stayed to engage)
      if (eng >= 5 && lr >= 3) return 1;
      if (eng >= 2 && lr >= 1) return 0.5;
      return 0;
    },
    rationale:(d:VideoData, score:number|null) => {
      const eng = engProxy(d).toFixed(1), lr = likeRate(d).toFixed(2);
      if (score === 1)  return `Eng proxy ${eng}% + like rate ${lr}% -> strong 3-sec hold signal. Kill threshold: <40% hold = 5-10x less reach. IG tests non-followers first - hook must land before caption overlay at ~1.5s.`;
      if (score === 0.5) return `Eng proxy ${eng}% -> moderate hook signal. Use Trial Reels to measure 3-sec hold on non-followers before main feed commit. Test 3 different hooks.`;
      return `Eng proxy ${eng}% -> weak hook. #1 cause of IG distribution failure. Visual hook must create pattern interrupt in under 1.5s. Use Trial Reels - it shows hold rate from non-followers specifically.`;
    }},

  { id:"ig-watch-time", label:"Completion  (>=50% for Explore eligibility)",
    weight:10, tier:1, autoAssessable:true,
    check:(d:VideoData) => {
      const eng = engProxy(d), dur = d.durationSeconds;
      const opt = (dur >= 7 && dur <= 15) || (dur >= 30 && dur <= 90);
      if (eng >= 5 && opt) return 1;
      if (eng >= 2 && dur >= 7) return 0.5;
      return 0;
    },
    rationale:(d:VideoData, score:number|null) => {
      const dur = d.durationSeconds;
      const ds = dur < 60 ? `${dur}s` : `${Math.floor(dur/60)}m${dur%60}s`;
      const eng = engProxy(d).toFixed(1);
      if (score === 1)  return `${eng}% eng proxy + ${ds} optimal duration -> strong completion signal. >=50% completion required for Explore page eligibility. Two optimal modes: 7-15s (punchy) or 30-90s (educational/value).`;
      if (score === 0.5) return `${eng}% eng, ${ds} -> moderate. Optimal lengths: 7-15s for visual impact; 30-90s for educational. Move payoff earlier.`;
      return `${eng}% eng -> weak. Below 50% completion = not Explore eligible. Tighten edit or reduce duration to one of the two optimal length modes.`;
    }},

  // TIER 2: Strong (30 pts)

  { id:"ig-no-watermark", label:"No Third-Party Watermark  (Zero tolerance)",
    weight:10, tier:2, autoAssessable:false,
    check:(_d:VideoData) => null,
    rationale:() => "Cannot assess programmatically. Instagram pixel+audio fingerprints every upload. Any TikTok or CapCut watermark = automatic exclusion from recommendations permanently. Always export clean from editing software before uploading."},

  { id:"ig-originality", label:"Originality Score  (<=10 reposts / 30 days)",
    weight:8, tier:2, autoAssessable:false,
    check:(_d:VideoData) => null,
    rationale:() => "Cannot assess from metadata. Accounts that repost >=10 times in 30 days receive an account-level originality flag suppressing ALL content from the account. Recovery: 60-90 days. Hard rule: never exceed 10 reposts in any 30-day window."},

  { id:"ig-dual-signal", label:"Dual-Signal CTA  (DM + Save in same line)",
    weight:7, tier:2, autoAssessable:false,
    check:(_d:VideoData) => null,
    rationale:() => "Cannot assess. The IG distribution holy grail: one CTA that fires DM sends + saves simultaneously. Example: 'Save this formula - and send it to whoever you are doing a challenge with.' Highest algorithmic yield of any single CTA on Instagram."},

  { id:"ig-comment-quality", label:"Comment Depth  (Substantive replies)",
    weight:5, tier:2, autoAssessable:true,
    check:(d:VideoData) => {
      const r = commentRate(d);
      return r >= 0.5 ? 1 : r >= 0.2 ? 0.5 : 0;
    },
    rationale:(d:VideoData, score:number|null) => {
      const r = commentRate(d).toFixed(3);
      if (score === 1)  return `Comment rate ${r}% -> strong. Meta MSI scores comments >=5 words at 10x an emoji reaction. Substantive replies improve distribution to similar interest audiences.`;
      if (score === 0.5) return `Comment rate ${r}% -> moderate. Ask: "What rule trips you up most in your challenge?" Specific questions produce longer, more algorithmically valuable replies.`;
      return `Comment rate ${r}% -> weak. Add a genuine topic-specific question requiring a real answer - not "What do you think?" but something specific to the video content.`;
    }},

  // TIER 3: Supporting (15 pts)

  { id:"ig-aspect-ratio", label:"Vertical Format  (9:16 optimal, 4:5 acceptable)",
    weight:5, tier:3, autoAssessable:false,
    check:(_d:VideoData) => null,
    rationale:() => "Cannot assess from metadata. 9:16 optimal. 4:5 acceptable. 16:9 horizontal = ~30% less reach in the Reels feed."},

  { id:"ig-hook-timing", label:"Visual Hook Before Caption Overlay  (< 1.5 seconds)",
    weight:5, tier:3, autoAssessable:false,
    check:(_d:VideoData) => null,
    rationale:() => "Cannot assess from metadata. Instagram caption overlay appears at ~1.5s. Visual hook must create a reason to stay before the caption appears. First 1.5s must be entirely visual - striking image, number, or action."},

  { id:"ig-trial-reels", label:"Trial Reels Testing  (A/B hook on non-followers first)",
    weight:5, tier:3, autoAssessable:false,
    check:(_d:VideoData) => null,
    rationale:() => "Cannot assess from metadata. Trial Reels shows 3-sec hold rate from non-followers before main feed commit. If below 50%, rebuild the hook. Single most underused RM tool on Instagram in 2026."},

  // TIER 4: Baseline (5 pts)

  { id:"ig-hashtags", label:"Hashtag Strategy  (5-10 mixed tiers)",
    weight:3, tier:4, autoAssessable:true,
    check:(d:VideoData) => {
      const t = d.tags?.length ?? 0;
      return (t >= 5 && t <= 10) ? 1 : (t >= 3 && t <= 15) ? 0.5 : t > 0 ? 0.25 : 0;
    },
    rationale:(d:VideoData, score:number|null) => {
      const t = d.tags?.length ?? 0;
      if (score === 1)  return `${t} hashtags -> optimal. Mix: 1-2 niche (#proptrading) + 2-3 mid (#forextrading) + 1-2 broad (#investing). Reels use hashtags for classification, not primary discovery.`;
      if (score === 0.5) return `${t} hashtags -> acceptable. Aim for 5-10 mixed-tier hashtags for content classification.`;
      return `${t === 0 ? "No" : t} hashtags -> add 3-5 for content classification and interest-matched distribution.`;
    }},

  { id:"ig-caption", label:"Caption  (Question or save trigger)",
    weight:2, tier:4, autoAssessable:true,
    check:(d:VideoData) => {
      if (!d.title) return 0;
      const hasQ = /\?/.test(d.title);
      const hasSave = /save|bookmark|reference|keep/i.test(d.title);
      return (hasQ || hasSave) ? 1 : d.title.length > 50 ? 0.5 : 0.25;
    },
    rationale:(d:VideoData) => {
      const hasQ = /\?/.test(d.title ?? "");
      const hasSave = /save|bookmark/i.test(d.title ?? "");
      if (hasQ || hasSave) return `Caption includes a ${hasQ ? "question" : "save trigger"} - effective. Two effective patterns: specific answerable question, or save trigger with future-utility reason.`;
      return `Caption lacks question or save trigger. Add one: (1) specific question requiring real answer, or (2) save trigger ("save this before your next challenge"). Generic CTAs are algorithmically ignored.`;
    }},
];
