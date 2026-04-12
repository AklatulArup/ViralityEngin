# Viral Readiness Score (VRS) — Weighted Scoring System

## Overview

The Viral Readiness Score (VRS) is a 0–100% weighted scoring system that evaluates content against every measurable algorithmic criterion for its platform. Each criterion is weighted by its actual algorithmic importance — so a video scoring well on the top-weighted signals (watch time, completion, satisfaction) earns far more than a video scoring well only on low-weight signals (hashtags, format compliance).

A score of 100% means the content has maximally satisfied every quantifiable signal, weighted by how much the algorithm actually cares about each one. The remaining percentage shows exactly what's missing and how impactful each gap is.

**Important framing:** The VRS captures the controllable 80–90% of what makes content succeed algorithmically. There is always a subjective human element (timing, cultural moment, luck, audience mood) that cannot be quantified. A piece scoring 100% VRS has maximized every lever within the creator's control — the highest possible *probability* of going viral, though never guaranteed.

**Weight derivation:** Weights are derived from official platform documentation, open-sourced algorithm code (X/Twitter), confirmed statements from platform executives (Todd Beaupré at YouTube, Adam Mosseri at Instagram), third-party reverse-engineering research, and observable behavioral data. Where exact weights are unknown, they reflect the confirmed signal hierarchy.

---

## How to Use the VRS

### Scoring Methodology
1. Each criterion has a **weight** (points out of 100 total). Heavier weight = the algorithm cares more about this signal.
2. Score each criterion: **✅ Satisfied (full weight)** / **⚠️ Partial (half weight)** / **❌ Not Satisfied (0)** / **🔍 Not Visible (exclude)**
3. Calculate: `VRS = (Points Earned / Points Possible) × 100`
4. For "Not Visible" criteria, exclude from both numerator and denominator.
5. Always show the weight of each criterion so the user understands which gaps matter most.

### When Analyzing Existing Content (Mode C, D, or F)
1. Fetch/view the content
2. Score each criterion against the platform-specific weighted checklist
3. Present VRS with weight-aware breakdown
4. Gap analysis prioritized by weight — fixing a 10-point gap matters 5x more than a 2-point gap

### When Evaluating Pre-Publish Content
1. Review the content (thumbnail, title, hook, structure, format, audio, captions, etc.)
2. Score what can be assessed pre-publish
3. Flag post-publish criteria (engagement velocity, retention curve, etc.) as "TBD — monitor after publish"
4. Provide pre-publish VRS and specific improvements ranked by weight impact

---

## VRS Output Format

Always present the VRS in this structure:

```
## Viral Readiness Score: [X]%

**Platform:** [YouTube / TikTok / Instagram / X / LinkedIn]
**Content Type:** [Long-form / Short / Reel / Post / Thread / Carousel]
**Criteria Assessed:** [N of M] (M excludes "Not Visible" items)
**Points Earned:** [X] / [Y] possible

### Weight Tier Breakdown

**TIER 1 — Critical Signals (highest algorithmic weight):**
(List each Tier 1 criterion, its weight, and status ✅/⚠️/❌)
Points earned in Tier 1: [X] / [Y]

**TIER 2 — Strong Signals:**
(List each Tier 2 criterion, its weight, and status)
Points earned in Tier 2: [X] / [Y]

**TIER 3 — Supporting Signals:**
(List each Tier 3 criterion, its weight, and status)
Points earned in Tier 3: [X] / [Y]

**TIER 4 — Baseline Signals (lowest weight):**
(List each Tier 4 criterion, its weight, and status)
Points earned in Tier 4: [X] / [Y]

**NOT VISIBLE 🔍** (criteria that couldn't be assessed, with their weights)

### Gap Analysis — Ranked by Weight Impact
(For each ❌ and ⚠️, show the weight of the gap and the specific action to close it.
Sorted by weight — biggest gaps first.)

### Priority Fixes (Top 3 by Weight)
(The 3 changes that would add the most weighted points to the score)

### Viral Archetype Match
(What viral content archetype does this most closely resemble?
Which archetypes in this niche typically go viral?
See Viral Archetype Mapping section below.)
```

---

## Platform-Specific Weighted Scoring Criteria

---

### YouTube Long-Form VRS (100 points, weighted by algorithmic importance)

#### TIER 1 — Critical Signals (50 points total)
These are the signals YouTube's algorithm weights most heavily. Scoring well here is necessary for viral distribution.

| # | Criterion | Weight | What "Satisfied" Looks Like |
|---|---|---|---|
| 1 | **Viewer satisfaction** | **12** | Content delivers on its promise. Viewers feel time was well spent. High like-to-view ratio (≥4%). Positive comment sentiment. Low "Not Interested" signals. Post-watch survey proxy: would a viewer say "yes, this was worth my time"? This is YouTube's #1 signal in 2026. |
| 2 | **Watch time & retention quality** | **11** | Retention above 50% is solid; 60%+ is excellent; 70%+ is outstanding. Below 40% is the danger zone — YouTube deprioritizes regardless of CTR. Content is as long as it needs to be and no longer. Efficiency > padding. Duration × retention = strong absolute watch time. |
| 3 | **Hook (first 7–15 seconds)** | **9** | Establishes value within first 7 seconds (Creator Insider 2025). Opens with the most compelling visual, fact, question, or result. No logos, intros, or "hey guys." Front-loads the result or key insight. This determines whether the retention curve survives the first 30 seconds (where 30–40% of viewers typically drop). |
| 4 | **CTR (Quality Click Ratio)** | **9** | CTR above channel average. ≥5% is strong; ≥7% is exceptional. Clicks lead to satisfied viewing (high retention post-click), not just clicks alone. YouTube now tracks "Quality Click Ratio" — misleading thumbnails that get clicks but low retention face algorithmic headwinds. |
| 5 | **Retention structure** | **9** | Micro-pattern changes every 10–15 seconds (cut angle, graphic, B-roll, new info beat). Uses open loops — promises something coming later. No long dead spots. Spike and plateau patterns in retention graph, not steady decline. |

#### TIER 2 — Strong Signals (28 points total)
These significantly influence distribution but are secondary to Tier 1.

| # | Criterion | Weight | What "Satisfied" Looks Like |
|---|---|---|---|
| 6 | **Thumbnail: Packaging strength (combined)** | **8** | Emotional trigger (authentic face or compelling visual), high color contrast (passes grayscale test, ≥4.5:1 ratio), one clear focal point (understood in <1 second), text hook (3–5 words, doesn't repeat title, readable at 150px mobile), visual promise matches content. No bait-and-switch. |
| 7 | **Title: Curiosity & clarity** | **5** | Creates curiosity gap. Uses power words (numbers, emotional triggers, specificity). Clear topic signal for algorithm. Title + thumbnail work as unified promise without repeating each other. |
| 8 | **Comments per view ratio** | **5** | ≥2% is healthy; ≥4% is strong. Content includes a conversation trigger (question, controversy, debate point). Creator responds to comments in first 2 hours. Detailed conversations > single-word responses. |
| 9 | **Shares & saves** | **5** | Content has practical, emotional, or social value that motivates sharing. Saves/playlist adds indicate lasting utility. High share rate = strong audience endorsement. |
| 10 | **Session contribution** | **5** | Content keeps viewers on YouTube after watching. End screens, playlists, or natural curiosity to explore more. YouTube rewards videos that contribute to longer viewing sessions. |

#### TIER 3 — Supporting Signals (15 points total)
These help but rarely make or break viral distribution on their own.

| # | Criterion | Weight | What "Satisfied" Looks Like |
|---|---|---|---|
| 11 | **Non-subscriber reach** | **4** | Topic broad or timely enough to attract new audiences. High % of views from non-subscribers indicates algorithmic expansion. |
| 12 | **Like-to-dislike ratio** | **3** | ≥95% is very good; ≥97% is excellent. Assessed relative to creator baseline and content type. |
| 13 | **Search & topic alignment** | **3** | Title, description, tags contain searchable keywords. Topic has active search demand. Can be surfaced via YouTube Search. |
| 14 | **Series / archetype pattern** | **3** | Fits a recognizable content archetype that drives repeat viewership. Viewers can pattern-match. |
| 15 | **Thumbnail: Mobile readability** | **2** | All elements clearly visible at ≈150px width. Key elements centered. |

#### TIER 4 — Baseline Signals (7 points total)
Hygiene factors. Missing these hurts, but having them alone doesn't drive virality.

| # | Criterion | Weight | What "Satisfied" Looks Like |
|---|---|---|---|
| 16 | **Platform-native format** | **2** | Proper 16:9, good audio, no watermarks, uses YouTube features (chapters, cards, end screens). |
| 17 | **Thumbnail: Visual promise alignment** | **2** | No bait-and-switch. Energy match between thumbnail and content. |
| 18 | **Audio quality** | **1.5** | Clear, professional audio. No echo, background noise, or volume inconsistency. |
| 19 | **Description & metadata** | **1** | Proper description, relevant tags, correct category. Links, timestamps if applicable. |
| 20 | **Upload consistency** | **0.5** | Part of an active posting schedule. Not a one-off after weeks of silence. |

---

### YouTube Shorts VRS (100 points, weighted)

#### TIER 1 — Critical Signals (52 points)

| # | Criterion | Weight | What "Satisfied" Looks Like |
|---|---|---|---|
| 1 | **Completion rate** | **15** | ≥70% completion (2026 threshold for second-batch promotion). The dominant signal — viewed vs. swiped away. |
| 2 | **Hook (first 2–3 seconds)** | **13** | Viewer locked in within 2–3 seconds. Immediate value, question, or tension. No warm-up. |
| 3 | **Replay / loop potential** | **12** | Natural loop structure, unresolved tension, or rewatch-worthy content. Rewatch rate ≥15% is excellent. Replays are uniquely powerful for Shorts. |
| 4 | **First-frame stop power** | **12** | Opening frame arrests the scroll within 0.5–1 second. Strong visual energy, text hook, or pattern interrupt. |

#### TIER 2 — Strong Signals (28 points)

| # | Criterion | Weight | What "Satisfied" Looks Like |
|---|---|---|---|
| 5 | **Engagement velocity (first hour)** | **8** | Comments, shares, likes arrive quickly. Strong early signals determine further push. |
| 6 | **Shares** | **7** | "Send to a friend" value — entertainment, identity, or utility. |
| 7 | **Content pacing** | **7** | Fast, tight pacing. No filler. Every second earns the next. |
| 8 | **Comments** | **6** | Content provokes replies — controversial, relatable, question-worthy. |

#### TIER 3 — Supporting Signals (14 points)

| # | Criterion | Weight | What "Satisfied" Looks Like |
|---|---|---|---|
| 9 | **Topic/trend alignment** | **4** | Relevant to current trends, searchable terms, or active audience interests. |
| 10 | **Audio quality & choice** | **4** | Clear audio. Trending or original sound. No muffled or distorted audio. |
| 11 | **Text overlays & captions** | **3** | On-screen text reinforces hook. Captions present. Keywords spoken and displayed. |
| 12 | **Likes** | **3** | Healthy like-to-view ratio. Weakest positive signal but still matters. |

#### TIER 4 — Baseline Signals (6 points)

| # | Criterion | Weight | What "Satisfied" Looks Like |
|---|---|---|---|
| 13 | **Vertical format (9:16)** | **2** | Proper 9:16. 1080×1920px. No letterboxing. |
| 14 | **Safe zone compliance** | **2** | Key elements within center safe area. |
| 15 | **Originality** | **2** | Not a repost. No watermarks from other platforms. |

---

### TikTok VRS (100 points, weighted)

Watch time and completion account for ~40–50% of TikTok's algorithm weight based on platform documentation and reverse-engineering research.

#### TIER 1 — Critical Signals (52 points)

| # | Criterion | Weight | What "Satisfied" Looks Like |
|---|---|---|---|
| 1 | **Watch time & completion rate** | **18** | ≥70% completion (2026 threshold). Both absolute seconds AND percentage watched. A 60-second video at 70% = 42 seconds — 4x more valuable than a 10-second video watched fully. This is TikTok's #1 signal. |
| 2 | **Hook (first 3 seconds)** | **12** | 70%+ of viewers past 3 seconds. Immediate value, question, or tension. The 3-second rule determines everything. |
| 3 | **Qualified views (5+ seconds)** | **10** | Enough viewers past 5 seconds for "Qualified Views." Failure = stuck in "200-view jail." |
| 4 | **Replay count** | **12** | Natural loop or compelling reason to rewatch. ≥15% rewatch rate = excellent. Replays + saves + shares outweigh likes significantly. |

#### TIER 2 — Strong Signals (28 points)

| # | Criterion | Weight | What "Satisfied" Looks Like |
|---|---|---|---|
| 5 | **Shares** | **8** | "Send to a friend" value. Share-to-view ratio ≥1% is strong. One of the strongest distribution triggers. |
| 6 | **Saves** | **7** | Lasting value. Save-to-view ratio ≥2% is strong. "Save this" hooks directly increase saves. |
| 7 | **Comments** | **5** | Comment magnet. Creator replies (especially video replies). Two-way interaction is a ranking factor. |
| 8 | **Content pacing** | **4** | Fast payoff. Compact storytelling. Every second earns the next. No filler. |
| 9 | **Sound / audio** | **4** | Trending audio, original sound, or clear voiceover. TikTok rewards original sounds. |

#### TIER 3 — Supporting Signals (14 points)

| # | Criterion | Weight | What "Satisfied" Looks Like |
|---|---|---|---|
| 10 | **Keyword / caption SEO** | **4** | Keywords in caption, on-screen text, AND spoken audio. Spoken keywords in first 5 seconds carry strongest search signal. |
| 11 | **Trend alignment** | **4** | Sound, hashtag, format, or topic aligned with active trend at right moment. |
| 12 | **Creator-native delivery** | **3** | Feels native to TikTok. Authentic > polished. Not a repurposed ad. |
| 13 | **Niche consistency** | **3** | Content fits clear niche. Algorithm can match to right audience. |

#### TIER 4 — Baseline Signals (6 points)

| # | Criterion | Weight | What "Satisfied" Looks Like |
|---|---|---|---|
| 14 | **Vertical format (9:16)** | **2** | Proper 9:16. 1080×1920px. Horizontal/square = 40% less engagement. |
| 15 | **Safe zone compliance** | **2** | Key elements within center safe area. |
| 16 | **Likes** | **2** | Healthy like-to-view ratio. Weakest positive signal. |

---

### Instagram Reels VRS (100 points, weighted)

Instagram confirmed 3 primary signals (Mosseri, Jan 2025): watch time, sends per reach, likes per reach. DM shares are the #1 Reels distribution trigger in 2026.

#### TIER 1 — Critical Signals (50 points)

| # | Criterion | Weight | What "Satisfied" Looks Like |
|---|---|---|---|
| 1 | **DM shares (sends per reach)** | **15** | Content worth sending to someone. "This reminded me of you" moments, relatable humor, practical tips. DM shares weighted 3–5x higher than likes. 10x higher than likes for Reels. The #1 Reels signal. |
| 2 | **Watch time / completion** | **14** | Viewers watch to end. Completion rate strong. Rewatches count. A 30-second Reel watched fully by 60% outperforms a 15-second with 40% completion. |
| 3 | **First-frame stop power / hook** | **11** | Visual clarity, motion, or text hook that arrests scroll. 3-second retention ≥60%. Viewers decide within 1.7 seconds. |
| 4 | **Saves** | **10** | Practical, reference-worthy, "I'll need this later." Saves weighted ~3x higher than likes. |

#### TIER 2 — Strong Signals (28 points)

| # | Criterion | Weight | What "Satisfied" Looks Like |
|---|---|---|---|
| 5 | **Engagement velocity (first 30–60 min)** | **8** | Likes, comments, shares arrive quickly in first hour. Early velocity determines non-follower distribution. |
| 6 | **Rewatch / loop signal** | **7** | Short enough to rewatch or structured to loop. Immediate replays are especially strong signals. |
| 7 | **Originality** | **7** | Not a repost. No TikTok watermarks. Original content receives 40–60% more distribution. 10+ reposts in 30 days = excluded from recommendations. |
| 8 | **Comments & reply depth** | **6** | Meaningful comments. Creator responds promptly. Back-and-forth conversations. |

#### TIER 3 — Supporting Signals (15 points)

| # | Criterion | Weight | What "Satisfied" Looks Like |
|---|---|---|---|
| 9 | **Non-follower reach signals** | **4** | Topic engaging enough for cold audiences. Content reaches Explore or Reels feed. |
| 10 | **Audio / trending sound** | **4** | Trending or original audio. Audio adds value. |
| 11 | **Caption SEO** | **4** | Keywords for Instagram Search. 3–5 relevant hashtags max. Descriptive caption. |
| 12 | **Likes per reach** | **3** | Healthy ratio. A Reel seen by 1,000 with 50 likes outranks one seen by 10,000 with 100 likes. |

#### TIER 4 — Baseline Signals (7 points)

| # | Criterion | Weight | What "Satisfied" Looks Like |
|---|---|---|---|
| 13 | **Vertical format (9:16)** | **2** | Proper 9:16. 1080×1920px. Center-cropped for 3:4 grid. |
| 14 | **Cover image** | **2** | Custom cover for profile grid. Key elements centered. |
| 15 | **Hook text / CTA** | **2** | On-screen text or caption includes conversation trigger or CTA. |
| 16 | **Content pacing** | **1** | Tight pacing. Value delivered quickly. (Captured largely by watch time already.) |

---

### Instagram Carousel VRS (100 points, weighted)

#### TIER 1 — Critical Signals (48 points)

| # | Criterion | Weight | What "Satisfied" Looks Like |
|---|---|---|---|
| 1 | **Carousel completion (dwell time)** | **14** | Users swipe through all slides. High completion = strong dwell time. Each slide earns the next swipe. |
| 2 | **Saves** | **12** | Educational, practical, reference-worthy content people save for later. Strongest Feed signal. |
| 3 | **DM shares** | **12** | Worth sending to someone. "You need to see this." Relatable or useful. |
| 4 | **First slide hook** | **10** | Standalone hook: bold text, provocative question, surprising data, arresting visual. Stops the scroll. |

#### TIER 2 — Strong Signals (30 points)

| # | Criterion | Weight | What "Satisfied" Looks Like |
|---|---|---|---|
| 5 | **Information density** | **8** | Each slide adds new value. No filler. Actionable tips, data, insights. |
| 6 | **Engagement velocity** | **7** | Early engagement in first 30–60 minutes. |
| 7 | **Comments & discussion** | **6** | Sparks conversation. Open-ended question or debate point. |
| 8 | **Visual design quality** | **5** | Clean, professional. Bold text readable at mobile sizes. Consistent style. |
| 9 | **Caption SEO** | **4** | Keyword-rich caption. 3–5 relevant hashtags. |

#### TIER 3 — Supporting Signals (14 points)

| # | Criterion | Weight | What "Satisfied" Looks Like |
|---|---|---|---|
| 10 | **Slide count (sweet spot)** | **4** | 8–12 slides. Enough depth for dwell time, not so many it exhausts. |
| 11 | **CTA on final slide** | **4** | Clear call to action: follow, save, share, comment, link in bio. |
| 12 | **Originality** | **3** | Original content. Unique angle. Not reposted. |
| 13 | **Format (3:4 or 4:5)** | **3** | Proper aspect ratio for grid and feed display. |

---

### X (Twitter) VRS (100 points, weighted)

Weights derived directly from open-sourced algorithm code (March 2023, confirmed January 2026 xAI update). X is the only platform where we have exact relative weights from source code.

#### TIER 1 — Critical Signals (52 points)

| # | Criterion | Weight | What "Satisfied" Looks Like |
|---|---|---|---|
| 1 | **Reply chain with author (150x like)** | **16** | Author replies to comments creating genuine back-and-forth. One reply chain = 150x a like. The single highest-weighted signal in X's entire algorithm. |
| 2 | **Repost potential (20x like)** | **12** | Content is shareable — strong take, useful data, emotional resonance. Each repost = 20x a like. |
| 3 | **Reply magnet (13.5x like)** | **12** | Provokes replies — controversial, open question, strong contrarian angle. Each reply = 13.5x a like. |
| 4 | **First-hour engagement velocity** | **12** | Tweet loses half its visibility every 6 hours. First-hour velocity is make-or-break. Strong early replies, reposts, and bookmarks. |

#### TIER 2 — Strong Signals (26 points)

| # | Criterion | Weight | What "Satisfied" Looks Like |
|---|---|---|---|
| 5 | **Conversation depth / dwell (10x like)** | **7** | Drives people into conversation and keeps them 2+ minutes. Dwell = 10x a like. |
| 6 | **Bookmark-worthy (10x like)** | **6** | Lasting value worth saving. The "silent like." Not publicly visible but heavily weighted. |
| 7 | **Hook / opening line** | **5** | First line creates curiosity, makes bold claim, offers specific value. Stops the scroll. |
| 8 | **No external links in main post** | **4** | Links get 30–50% reach penalty. Zero median engagement for link posts from free accounts since March 2025. Links in replies only. |
| 9 | **Timeliness / recency** | **4** | Posted during active trend or conversation window. Right topic at right moment. |

#### TIER 3 — Supporting Signals (15 points)

| # | Criterion | Weight | What "Satisfied" Looks Like |
|---|---|---|---|
| 10 | **Quote tweet potential (~25x like)** | **4** | Content worth quoting with commentary. Shareable opinion or data point. |
| 11 | **Media use (image/video)** | **4** | Visual adds stopping power. Visual tweets outperform text-only. |
| 12 | **Engagement-to-follower ratio** | **3** | Punches above account size. High engagement relative to follower count. |
| 13 | **Topic relevance** | **2** | Aligned to active X Topics or trending conversations. |
| 14 | **Thread structure (if thread)** | **2** | Strong opening. Each tweet earns next click. Progressive value. |

#### TIER 4 — Baseline Signals (7 points)

| # | Criterion | Weight | What "Satisfied" Looks Like |
|---|---|---|---|
| 15 | **Hashtag discipline** | **3** | Maximum 1–2 targeted hashtags. 3+ triggers 40% penalty. |
| 16 | **TweepCred / account health** | **2** | Good standing. Active posting. High engagement history. Below 65 TweepCred = only 3 tweets considered. Premium gets +4–16 boost. |
| 17 | **Profile completeness** | **2** | Complete bio, profile photo, relevant pinned tweet. |

---

### LinkedIn VRS (100 points, weighted)

Dwell time replaced reactions as the primary signal in January 2026. Comment quality scoring updated February 2026.

#### TIER 1 — Critical Signals (52 points)

| # | Criterion | Weight | What "Satisfied" Looks Like |
|---|---|---|---|
| 1 | **Dwell time** | **16** | Post holds attention 45+ seconds. Posts with 61+ seconds dwell time average 15.6% engagement rate vs 1.2% for under 3 seconds. A 45-second reader without liking > a 2-second "pity like." |
| 2 | **Comment depth & quality** | **14** | Comments 15+ words, 2.5x more weight than short reactions. Industry expert comments carry 5–7x weight. Back-and-forth threads = 5.2x amplification. Creator replies in first 2 hours. One comment ≈ 5–10 likes. |
| 3 | **Hook (first 2 lines)** | **12** | First 1–2 lines before "see more" stop the scroll and earn the click. Data point, bold claim, or provocative question. This IS the CTR mechanism on LinkedIn. |
| 4 | **Engagement velocity (golden hour)** | **10** | Strong engagement in first 60 minutes. Comments and dwell time signals arrive quickly. Post shown to 2–5% of network initially — this window determines everything. |

#### TIER 2 — Strong Signals (26 points)

| # | Criterion | Weight | What "Satisfied" Looks Like |
|---|---|---|---|
| 5 | **"See more" expansion rate** | **6** | High % of readers click "see more." Hook earned the expansion. |
| 6 | **Saves** | **5** | Lasting reference value. Frameworks, templates, guides people bookmark. |
| 7 | **Shares / reposts with commentary** | **5** | Professionally shareable. Reposts with personal insight = high endorsement. Blind shares nearly invisible. |
| 8 | **Native format (no external links)** | **5** | No links in post body (link penalty). Native content always outperforms. If link needed, put in comments. |
| 9 | **Professional relevance** | **5** | Framework, insight, case study, industry analysis. Not generic motivation. Specific > broad. |

#### TIER 3 — Supporting Signals (15 points)

| # | Criterion | Weight | What "Satisfied" Looks Like |
|---|---|---|---|
| 10 | **Topic authority / niche consistency** | **4** | Post aligns with established expertise area. Consistent niche builds algorithmic authority. |
| 11 | **Carousel / document format (if visual)** | **4** | PDF carousel: 2–3x more dwell time than text. 8–12 slides. Each swipe = engagement signal. Average 55 seconds dwell vs 15 for text. |
| 12 | **Reaction type mix** | **3** | "Insightful" and "Love" > basic "Like." Higher quality signals. |
| 13 | **Non-connection reach** | **2** | Content reaches 2nd/3rd connections. Algorithmically amplified beyond network. |
| 14 | **Post length (sweet spot)** | **2** | 1,300–2,000 characters. Long enough for dwell time, short enough for quality throughout. |

#### TIER 4 — Baseline Signals (7 points)

| # | Criterion | Weight | What "Satisfied" Looks Like |
|---|---|---|---|
| 15 | **No engagement bait** | **3** | No "Comment YES." No mass tagging. No excessive hashtags/emojis. Genuine only. |
| 16 | **Posting time** | **2** | B2B: Tue–Thu, 8–10am and 12–1pm local time. When audience is most active. |
| 17 | **Upload consistency** | **2** | 3–5x per week, consistently. No long gaps followed by bursts. |

---

## Cross-Platform Universal Criteria (always evaluate alongside platform-specific VRS)

These meta-criteria apply to all content. They don't add to the 100-point score but should always be noted in the analysis:

1. **Content-promise alignment** — Does the content deliver what the packaging promised? Mismatch kills retention on every platform.
2. **Emotional or utility payoff** — Triggers a strong emotion (inspiration, humor, anger, surprise, nostalgia) OR delivers dense practical value? Neither = rarely viral.
3. **Audience expansion potential** — Topic broad or timely enough to reach beyond existing followers?
4. **Trend alignment** — Riding an active trend at the right moment?
5. **Originality** — Original and platform-native? Reposts and recycled material penalized everywhere in 2026.

---

## Interpreting Weighted VRS Scores

| VRS Range | Assessment | What It Means |
|---|---|---|
| 90–100% | **Viral-ready** | All critical and strong signals satisfied. Maximum probability of viral distribution. |
| 75–89% | **Strong performer** | Most Tier 1 and 2 signals satisfied. Specific gaps that, if closed, could push into viral territory. |
| 60–74% | **Competitive** | Tier 1 partially satisfied, some Tier 2 gaps. Decent distribution but unlikely to break out. |
| 40–59% | **Needs work** | Significant Tier 1 gaps. Content will likely underperform. Priority fixes needed. |
| Below 40% | **Fundamental rework** | Critical signals not satisfied. Major structural changes needed. |

**Important nuance:** A video scoring 65% but with all Tier 1 criteria satisfied is in a STRONGER position than a video scoring 75% with Tier 1 gaps and high Tier 3/4 scores. Always look at the tier distribution, not just the total number.

---

## Viral Archetype Mapping

### What This Is

When analyzing a creator, niche, or set of content, always map the **viral archetypes** — the recurring content types, formats, and angles that consistently produce outliers in that space. This goes beyond individual video analysis to show *patterns* of what goes viral.

### How to Build an Archetype Map

1. **Pull the creator's (or niche's) top-performing content** — last 30–90 days, sorted by views or engagement relative to baseline
2. **Identify the outliers** — content performing ≥2x the creator's median
3. **Classify each outlier into an archetype** — what TYPE of content is it?
4. **Run a VRS on each outlier** — which weighted criteria did it satisfy?
5. **Find the patterns** — which archetypes appear most often? Which VRS criteria are consistently satisfied in outliers?

### Archetype Classification Categories

Classify each outlier into one or more of these categories:

| Archetype | Description | Example in Trading/Prop Firm Niche |
|---|---|---|
| **Challenge / Transformation** | Pass/fail stories, before/after, journey content | "I passed the FundedNext challenge in 3 days — here's how" |
| **Educational / How-To** | Teaching a skill, explaining a concept, tutorial | "The only risk management strategy you need" |
| **Controversy / Hot Take** | Contrarian opinion, calling out bad practices, debate | "Why 90% of funded traders lose their accounts" |
| **Data / Proof** | Showing real results, account screenshots, P&L | "My exact trades this week — $4,200 profit breakdown" |
| **Emotional / Story** | Personal story, struggle, motivation, raw vulnerability | "I blew my funded account and here's what I learned" |
| **Reaction / Commentary** | Reacting to news, other creators, market events | "The market just crashed — here's what to do" |
| **Trend-Riding** | Using a trending format, sound, or topic | Trading content set to a viral audio trend |
| **Comparison / Versus** | Comparing two things side by side | "FundedNext vs FTMO — which is actually better?" |
| **Myth-Busting** | Debunking common misconceptions | "Everything you've been told about prop firms is wrong" |
| **Behind-the-Scenes / Day-in-Life** | Showing the real process, daily routine, workspace | "A day in my life as a funded trader" |
| **List / Ranking** | Top X, best of, ranked list | "Top 5 trading mistakes that will blow your account" |
| **Utility / Tool** | Template, checklist, calculator, resource | "Free trading journal template — download link in bio" |

### Archetype Map Output Format

When presenting a viral archetype map, use this structure:

```
## Viral Archetype Map: [Creator / Niche]

**Analysis period:** [date range]
**Content analyzed:** [N videos/posts]
**Outliers identified:** [N] (performing ≥2x median)

### Archetype Distribution (outliers only)

1. [Archetype] — [X]% of outliers ([N] videos)
   Average VRS: [X]%
   Key criteria consistently satisfied: [list top 3 by weight]
   Example: [specific video/post]

2. [Archetype] — [X]% of outliers
   ...

### VRS Criteria Pattern Across All Outliers

**Almost always satisfied in outliers (≥80% of the time):**
- [Criterion] (Weight: X) — satisfied in [Y]% of outliers
- ...

**Sometimes satisfied (40–79%):**
- ...

**Rarely satisfied but still went viral (<40%):**
- [Criterion] — these outliers succeeded despite this gap, suggesting other signals compensated
- ...

### What This Means for FundedNext
- The [archetype] format has the highest outlier rate — prioritize this
- The most critical VRS criteria for this niche are [X, Y, Z]
- The biggest untapped opportunity is [archetype that competitors aren't doing well]
```

### Using Archetype Maps with VRS

When scoring new content with VRS, always cross-reference against the archetype map:
- Does this content match a proven viral archetype for this niche?
- Does it satisfy the criteria that outliers in this archetype typically satisfy?
- If the content doesn't match any known archetype, that's not necessarily bad — but it means the prediction confidence is lower since we have no pattern to compare against.

---

## How to Use VRS for FundedNext

**Pre-publish review:** Before any FundedNext creator publishes content, run a weighted VRS. Focus fixes on Tier 1 gaps first — these have the highest point impact. A Tier 1 gap is worth 5x more than a Tier 4 gap.

**Post-publish diagnosis:** When a video underperforms, run a VRS to identify exactly which weighted criteria weren't met. "This video scored 58% because it failed on satisfaction (12 points lost), hook (9 points lost), and completion rate (11 points lost)" is actionable. "This video didn't perform well" is not.

**Competitor benchmarking:** Run VRS on competitor outliers (Mode C/E). Map their viral archetypes. Compare against FundedNext's archetype distribution to find gaps and opportunities.

**Content playbook development:** Track which VRS tiers FundedNext consistently scores low on. If Tier 1 is consistently weak, no amount of Tier 3/4 optimization will fix it. Build training around the highest-weight gaps.

**Calibration with API data:** Once YouTube API and vidIQ API are connected, VRS becomes data-driven: pull creator's last 50 videos → calculate statistical baseline → compare new content's weighted VRS against historical outlier thresholds → output a probability estimate grounded in that creator's actual performance distribution.
