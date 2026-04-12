# Platform Algorithm Deep Dive — 2026 Comprehensive Reference

## Table of Contents
1. YouTube Algorithm (2026)
2. YouTube Shorts Algorithm (2026)
3. TikTok Algorithm (2026)
4. Instagram Algorithm (2026)
5. X (Twitter) Algorithm (2026 — Open Source)
6. LinkedIn Algorithm (2026)

---

## 1. YouTube Algorithm (2026)

### The Satisfaction-Weighted Discovery Shift

The single most important change in 2025–2026: YouTube moved from raw watch time as the dominant signal to **satisfaction-weighted discovery**. This means a shorter video where viewers watch 100% and click "like" sends a stronger signal than a longer video with 40% retention.

YouTube now collects millions of post-watch survey responses asking viewers: "Was this video worth your time?" These satisfaction signals, combined with behavioral data, now outweigh raw watch time.

### 5 Distinct Recommendation Systems

YouTube is not one algorithm — it's five:

**1. Browse (Home Feed):** Viewers see this when opening YouTube. Ranked by predicted engagement + satisfaction. Signals: CTR, watch time, satisfaction surveys, viewer history, channel diversity. Getting featured here = algorithmic stamp of approval.

**2. Suggested (Watch Next):** Appears alongside/after current video. Ranked by topical relevance + viewer history. Key: content must match the "viewing session" context. Videos from the same channel or topic cluster get priority.

**3. Search:** YouTube is the world's 2nd largest search engine. Ranked by keyword relevance + engagement quality + recency. CTR and watch time for the specific search query determine ranking.

**4. Shorts Feed:** Completely separate engine since late 2025. Swiped, not clicked. Ranked by swipe-through rate, completion rate, loop rate, shares. Poor Shorts performance no longer drags down long-form.

**5. Notifications / Subscriptions:** Not purely algorithmic — engagement history determines who gets notified. If a subscriber hasn't watched the last 5 videos, YouTube quietly stops sending notifications.

### Ranking Signals (Ordered by 2026 Influence)

1. **Viewer Satisfaction** (Highest) — Surveys, sentiment modeling, likes/dislikes, long-session retention, repeat viewing, "Not Interested" feedback
2. **Watch Time Quality** — Not just total minutes, but retention rate relative to video length. 70%+ retention is excellent. Below 40% is the danger zone.
3. **Click-Through Rate (Quality Click Ratio)** — Clicks that lead to satisfied viewing, not just clicks alone. Misleading thumbnails that get clicks but low retention now face algorithmic headwinds.
4. **Session Contribution** — Does the video keep the viewer on YouTube? Session time across multiple videos matters.
5. **Comments** — Higher weight than likes. Detailed conversations > single-word responses. Channels replying to 50+ comments in first 2 hours see 15–20% higher reach.
6. **Shares** — Strong endorsement signal.
7. **Saves / Playlist Adds** — Utility signal. Drives repeat views.
8. **Likes** — Moderate signal. Still positive but weaker than comments, shares, saves.
9. **"Not Interested" / "Don't Recommend"** — Strong negative weight. Suppresses distribution.

### Key 2025–2026 Updates

- **Satisfaction > watch time:** Efficiency matters more than length. A tight 8-min video viewers love outperforms a bloated 20-min video with 50% abandonment.
- **Shorts fully decoupled:** Separate recommendation engine. Poor Shorts no longer hurt long-form.
- **Multi-language support:** Auto-dubbing, expressive captions, lip sync. Global reach is easier.
- **AI content policy:** AI content is NOT suppressed if properly disclosed. Mass-produced template content faces demonetization under the July 2025 "inauthentic content" policy.
- **Establish value in 7 seconds:** Creator Insider confirmed in 2025 — not 15, not 30. Seven seconds.
- **Community Posts matter:** They keep subscribers engaged between uploads, training the notification algorithm.

### Key Sources to Monitor
- **Creator Insider** (youtube.com/@creatorinsider) — YouTube's official creator-technical channel
- **vidIQ** (youtube.com/@vidIQ) — Data-driven YouTube strategy and algorithm analysis
- **YouTube Creator Academy** — Official educational resources
- **YouTube Official Blog** — Policy and feature announcements
- **Todd Beaupré interviews** — Senior Director of Growth & Discovery, primary source for algorithm philosophy

---

## 2. YouTube Shorts Algorithm (2026)

Fully separated from long-form since late 2025. Different signals, different engine.

### Ranking Signals

1. **Viewed vs. swiped away** (Highest) — The primary metric. Users swipe, not click. CTR is irrelevant.
2. **Completion rate** — 2026 threshold for second-batch promotion: ~70% (up from ~50% in 2024).
3. **Replay count** — Loopable content wins. Replays are a signal unique to Shorts.
4. **Comments & shares** — Engagement velocity in first hour determines wider push.
5. **Likes** — Moderate signal, weaker than completion and replay.

### Key Behaviors
- Shorts are now a testing ground for the algorithm — YouTube uses Shorts to figure out who your content resonates with
- Strong Shorts performance can boost long-form recommendations (but poor performance no longer hurts long-form)
- Shorts can be up to 3 minutes (expanded from 60 seconds)
- The "first second" is everything — no cover image, no title to read, just the video auto-playing

---

## 3. TikTok Algorithm (2026)

### Structural Changes in 2026

**The Oracle/US Deal:** In January 2026, TikTok signed an agreement for Oracle/American investors to control ~80% of US operations. The algorithm is being retrained on American user data through mid-2026. Expect distribution fluctuations, but fundamental signals (watch time, completion, shares) carry over regardless.

**Follower-First Testing:** TikTok is now testing content with followers FIRST before non-followers (a shift from the original pure interest-graph approach). Phase 1 shows to followers → Phase 2 expands to similar non-followers if engagement clears threshold → Phase 3 viral scaling → Phase 4 plateau.

### TikTok is an Interest Graph, Not a Social Graph

Unlike Instagram or YouTube, TikTok evaluates every video independently based on engagement signals — follower count is NOT a direct ranking factor. Small accounts can go viral if content triggers the right signals.

### Ranking Signals (2026 Priority Stack)

1. **Watch time & completion rate** (~40–50% of algorithm weight) — The dominant signal. Both absolute seconds AND percentage watched. 70% completion is the 2026 viral threshold. A 60-second video watched 70% = 42 seconds of watch time — 4x more valuable than a 10-second video watched fully.
2. **Replays** — Viewers who immediately rewatch signal exceptional content quality. Rewatch rate ≥15% is excellent.
3. **Shares** — "Send to a friend" value. Share-to-view ratio ≥1% is strong. One of the strongest distribution triggers.
4. **Saves** — Lasting value signal. Save-to-view ratio ≥2% is strong. "Save this" hooks directly increase saves.
5. **Comments** — Comment magnets drive distribution. Two-way interaction (creator replying) is a ranking factor. Video replies to comments create additional algorithmic content.
6. **Qualified Views (5+ seconds)** — Videos failing to generate enough qualified views get stuck in "200-view jail." Hook must hold past 5 seconds.
7. **Likes** — Weakest positive signal. Deeper engagement (replays, saves, shares, comments) carries much more weight.

### Distribution Tiers
- **Tier 1 (Hook Test):** 300–500 people. Tests immediate stop-scroll power.
- **Tier 2 (Retention Push):** 10,000–50,000. Tests completion rate of entire video. Need 70%+ to advance.
- **Tier 3 (Viral Scaling):** Millions. Needs high velocity in saves and shares. Content recommended to general audience.
- **Tier 4 (Plateau):** Distribution slows as relevant audiences exhausted or engagement rate drops.

### Key 2026 Changes
- Completion rate bar raised to ~70% (from ~50% in 2024)
- Follower-first testing (content shown to followers before strangers)
- Search is a major distribution surface — 49% of US consumers use TikTok as search engine. Keywords in captions, on-screen text, AND spoken audio matter. Spoken keywords in first 5 seconds carry strongest search signal.
- Topic authority > posting volume. 3–4 quality niche posts per week > daily random content.
- Authentic > polished. Behind-the-scenes and raw content sees 31% higher engagement than heavily edited.
- Videos up to 3 minutes, with longer formats getting 2x more views when watch time percentage is maintained.

---

## 4. Instagram Algorithm (2026)

### Multiple AI Systems, Not One Algorithm

Instagram uses separate ranking systems for Feed, Reels, Stories, and Explore. Each surface weighs different signals.

### The 3 Most Important Signals (Confirmed by Adam Mosseri, January 2025)

1. **Watch Time** — How long people watch your content. Most important for initial distribution. Viewers decide within 1.7 seconds whether to continue watching.
2. **Sends Per Reach (DM Shares)** — Most powerful signal for reaching NEW audiences. When someone DMs your Reel, Instagram treats it as a strong quality endorsement. Weighted 3–5x higher than likes. 694,000 Reels sent via DM every minute.
3. **Likes Per Reach** — Ratio of likes to impressions. Matters more for existing followers than new audiences.

### Reels Algorithm (2026)
- DM shares = #1 distribution trigger
- Completion rate + rewatches = strong quality signals
- Engagement velocity in first 30–60 minutes determines non-follower distribution
- Reels up to 3 minutes now reach non-followers through recommendations
- Originality enforced: original content gets 40–60% more distribution than reposts. Accounts posting 10+ reposts in 30 days get excluded from recommendations.
- No TikTok watermarks — aggregator penalty actively enforced
- Audio: trending or original audio adds signal. No watermarked audio from other platforms.

### Feed Algorithm (2026)
- Relationship strength first — content from accounts you interact with most
- Post popularity (early engagement velocity)
- Recency — newer posts prioritized
- Content type preference — algorithm learns if you prefer Reels, photos, or carousels

### Stories Algorithm (2026)
- Recency + relationship strength
- Whose Stories you watch most and engage with
- Daily posting (3–7 frames) optimal
- Story replies via DM strengthen relationship signals for both Stories and Feed

### Explore Algorithm (2026)
- Entirely non-followed content, personalized by behavior
- Engagement velocity in first 1–2 hours critical
- Likes, saves, shares weighted most
- User interest matching based on past Explore behavior

### Key 2026 Changes
- Views (not just engagement rate) now primary currency
- Caption SEO > hashtags for discovery. Captions fully indexable in Instagram Search.
- 3–5 hashtags max (excessive = suppression). Hashtags are content classification signals, not discovery tools.
- Carousel posts: up to 20 images, 10.15% average engagement rate. Carousel completion = strong dwell time.
- "Reset Suggested Content" feature — users can wipe algorithmic history. Brands must continuously re-earn feed placement.
- Saves weighted ~3x higher than likes
- DM shares weighted ~10x higher than likes for Reels

---

## 5. X (Twitter) Algorithm (2026 — Open Source)

### The Open-Source Algorithm

X is unique: it open-sourced its recommendation algorithm on GitHub (March 2023, updated September 2025 and January 2026 xAI release). We know the exact engagement weights.

### Architecture: 3-Stage Pipeline

**Stage 1: Candidate Retrieval** — System scans ~500 million daily tweets, narrows to ~1,500 candidates per user. 50% from in-network (accounts you follow, ranked by Real Graph model predicting engagement likelihood), 50% from out-of-network (accounts you don't follow, sourced via SimClusters, TwHIN embeddings, and GraphJet).

**Stage 2: Machine Learning Ranking** — A ~48M parameter neural network scores each candidate by predicting 10 probability labels (like, retweet, reply, click, media engagement, relevance, reading time, negative engagement, report, suppress). ~6,000 features analyzed per tweet.

**Stage 3: Filtering & Mixing** — Diversity rules, quality thresholds, ad integration, timeline construction.

### Confirmed Engagement Weights (from open-source code)

| Action | Weight (relative to Like) | Scoring Value |
|---|---|---|
| **Reply that gets author reply back** | **150x** | +75 |
| **Quote tweet** | **~25x** | (estimated) |
| **Repost (Retweet)** | **20x** | +1.0 (probability-weighted) |
| **Reply** | **13.5x** | +13.5 |
| **Profile click → like/reply** | **12x** | +12.0 |
| **Conversation click → reply/like** | **11x** | +11.0 |
| **Bookmarks** | **10x** | +10.0 |
| **Dwell time (2+ min in conversation)** | **10x** | +10.0 |
| **Like (favorite)** | **1x (baseline)** | +0.5 |
| **Video watch (50%+)** | **Very low** | +0.005 |

### Key Infrastructure Components (from GitHub)
- **Real Graph:** Predicts engagement likelihood between pairs of users based on historical interactions. The most important in-network ranking component.
- **SimClusters:** Community detection using Metropolis-Hastings algorithm. Groups users into ~100k interest communities. Content recommended per-community.
- **TwHIN (Twitter Heterogeneous Information Network):** Graph embeddings capturing social signals (follow-graph), content engagement, and ad engagement. Trained on 16x A100 GPUs.
- **GraphJet:** Real-time bipartite interaction graph. Tracks user-tweet interactions. 1M graph edges/second ingestion.
- **TweepCred:** Hidden reputation score (0–100) using weighted PageRank. Below 65 = only 3 of your tweets considered for distribution. Premium subscribers get +4 to +16 point boost.

### Key 2025–2026 Changes
- **Grok AI powers ranking:** Reads every post and watches every video. Sentiment analysis rewards constructive tone.
- **Link suppression intensified:** 30–50% reach penalty for external links. Zero median engagement for link posts from free accounts since March 2025 (Buffer data). Post links in replies.
- **Premium reach gap widened:** Premium accounts get ~10x more reach per post. The pay-to-play gap is the largest of any social platform.
- **Following tab now algorithmic:** Since November 2025, sorted by Grok-predicted engagement (users can toggle to chronological).
- **Average engagement rate dropped to 0.12%** (down 48% year-over-year — steepest decline of any platform).
- **Time decay:** Tweet loses half its visibility score every 6 hours. First-hour engagement velocity critical.
- **Multiple hashtags penalized by 40%.** Maximum 1–2 targeted hashtags.

### Key Implication for FundedNext
Optimize for **reply chains** (150x a like) and **reposts** (20x a like), not likes. One genuine back-and-forth reply chain is worth more than hundreds of likes. "Like and retweet" strategies are fundamentally inefficient. Bookmarks (10x) are the "silent like" — create content worth saving.

---

## 6. LinkedIn Algorithm (2026)

### The Depth Score Era

LinkedIn's primary ranking signal in 2026 is the **Depth Score** — measuring quality of interaction rather than quantity. The algorithm tracks scroll depth, comment relevance, and dwell time to determine distribution.

### 3-Stage Distribution Pipeline

**Stage 1: Quality Gate** — LinkedIn's AI evaluates clarity, relevance, and professionalism before showing to anyone. Engagement bait, AI filler, spam patterns, and excessive tags/hashtags/emojis trigger suppression. Stricter in 2026 due to AI content volume.

**Stage 2: Small Audience Test (Golden Hour)** — Post shown to 2–5% of network in first 60 minutes. Algorithm measures engagement quality — not just quantity. Comments, dwell time, and "see more" clicks are primary signals.

**Stage 3: Expanded Distribution** — If engagement quality clears threshold, post distributed to wider audience — 2nd/3rd degree connections. Can continue distributing for 48–72 hours (or even weeks for evergreen content).

### Ranking Signals (2026 Priority)

1. **Dwell Time** (Highest) — How long users spend reading the post. Posts with 61+ seconds dwell time average 15.6% engagement rate vs 1.2% for under 3 seconds. A user spending 45 seconds reading without liking is worth more than a 2-second "pity like."
2. **Comment Quality** — Comments 15+ words carry 2.5x more weight than shorter reactions. Comments from industry experts carry 5–7x more weight. Back-and-forth threads (users replying to each other) = 5.2x more amplification. "Great post!" is nearly worthless.
3. **"See More" Expansion Rate** — Whether people click to expand long-form posts. The first 1–2 lines are the entire CTR mechanism.
4. **Saves** — Content with lasting reference value.
5. **Shares / Reposts with Commentary** — Reposts with personal insight signal high endorsement. Blind shares are nearly invisible.
6. **Reaction Type Mix** — "Insightful" and "Love" > basic "Like."
7. **Carousel / Document Completion** — Each page view = dwell time. Carousels average 55 seconds vs 15 seconds for text posts.
8. **Likes** — Weakest signal. One comment ≈ 5–10 likes in algorithmic impact.

### Key 2026 Changes
- **January 2026:** Dwell time replaced reactions as primary ranking signal
- **February 2026:** Comment quality scoring updated — generic comments nearly worthless, thread-generating replies count 3x
- **March 2026:** Link penalty increased, Creator Mode deprecated (all accounts treated equally), newsletters boosted, carousels boosted
- **Topic authority matters:** Consistent posting in one niche builds algorithmic expertise signals. Niche experts outperform broad generalists.
- **External links penalized:** Native content always outperforms link posts. If link needed, place in comments.
- **AI content detection:** LinkedIn actively downranks content that reads like generic AI filler. Human voice + specific insights > polished but soulless content.
- **Optimal post length:** 1,300–2,000 characters for text posts
- **Optimal posting frequency:** 3–5x per week, consistently
- **Optimal format:** Carousels/documents for dwell time, text posts for comments, native video (9:16) for reach

### Key Implication for FundedNext
LinkedIn = dwell-time-first platform. Long-form posts that earn full reads, carousels swiped all the way through, and substantive comment threads beat short, shallow content every time. For FundedNext: thought leadership posts, trader success case studies, trading psychology frameworks, and educational carousels perform best. Create content professionals would save for reference or share with their network.
