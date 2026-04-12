# Sentiment, Growth Metrics & Analytics Tools Reference

## Table of Contents
1. Sentiment Analysis
2. Cross-Platform Creator Sentiment & Reputation Tracking
3. Like-to-Dislike Ratio Analysis
4. View Stats & Growth Metrics Framework
5. Analytics Tools Reference

---

## 1. Sentiment Analysis

Sentiment — the overall emotional tone of audience reactions — is a factor in YouTube's satisfaction-weighted discovery model and influences distribution on every platform.

**Signals to analyze:**

| Signal | What it tells you | How to check |
|---|---|---|
| **Comment tone** | Positive, negative, mixed, or sarcastic reactions | Manual review + vidIQ sentiment tracking, Hootsuite |
| **Like-to-dislike ratio** | Quick audience satisfaction pulse | Return YouTube Dislike extension/API |
| **Comment-to-view ratio** | How much content provokes response | YouTube Studio. ≥2% healthy; ≥4% strong. |
| **Positive comment ratio** | YouTube's sentiment model analyzes polarity | Track via vidIQ / Tubular Insights |
| **"Not interested" rate** | Viewers actively rejecting content | Not directly visible; sudden impression drops signal this |
| **Share/save vs. like ratio** | High = strong utility or emotional signal | Platform analytics |

**Diagnosis thresholds for FundedNext:**
- **Healthy**: Like ratio 95%+, substantive positive comments, saves/shares growing
- **Mixed**: Comments split, like ratio 85–94%, divisive engagement
- **Negative**: Like ratio below 85%, criticism-dominated comments, declining impressions

**By platform:**
- **YouTube**: Satisfaction surveys + comment sentiment + like/dislike ratios feed recommendations
- **TikTok**: Comment tone, duet/stitch reactions, share context signal sentiment
- **Instagram**: Share and save behavior are strongest positive sentiment proxies
- **X**: Reply quality and quote tweet tone. Being "ratio'd" (more replies than likes) = negative
- **LinkedIn**: Comment depth and quality. "Great post!" = weak. Thoughtful responses = genuine value

---

## 2. Cross-Platform Creator Sentiment & Reputation Tracking

Content sentiment and creator sentiment are different. A video might have great engagement while the creator's reputation is declining elsewhere. In the prop firm space, trust is the product.

**How to perform cross-platform analysis:**

1. **Start with home platform** — analyze comment tone, like ratio, share behavior, engagement quality
2. **Search other platforms:**
   - **X/Twitter**: Search `"creator name"` — check quote tweets, replies, mention sentiment. Opinion forms here first.
   - **Reddit**: Search `"creator name" site:reddit.com` — r/Forex, r/Daytrading, r/PropFirm have unfiltered discussions
   - **YouTube reaction videos**: Other creators' response videos reveal public perception
   - **TikTok comments**: Blunter and more direct than YouTube
   - **LinkedIn**: Professional content reception and tone shifts
3. **Assess trajectory** — improving, stable, or declining? Sustained negative pattern across platforms = deeper issue

**Cross-platform sentiment indicators:**

| Signal | Meaning | Where to look |
|---|---|---|
| "Ratio'd" on X | Public disagrees | X post metrics |
| Negative Reddit threads | Community turning against creator | Reddit search |
| Dislike spike on YouTube | Content-promise mismatch or backlash | Return YouTube Dislike |
| Comment section criticism floods | Audience trust eroding | All platforms |
| Quote tweets with mockery | Perception shifting negative | X quotes |
| Declining shares/saves | No longer "worth recommending" | Platform analytics |
| Positive mentions multi-platform | Strong cross-platform trust | All platforms |
| "Send to a friend" increasing | Genuine endorsement growing | Instagram DMs, X reposts |

**Sentiment tracking tools:**

| Tool | What it does | Price |
|---|---|---|
| **Brand24** | AI monitoring across social, news, blogs, podcasts. Emotion detection. | From $149/mo |
| **Awario** | Brand monitoring + basic sentiment across social + web | From $29/mo |
| **Sprout Social** | All-in-one social management with AI sentiment | Enterprise |
| **Talkwalker (Hootsuite)** | 150M+ sources. Sarcasm/slang/emotion detection. | Enterprise |
| **Brandwatch** | AI consumer intelligence. Competitive benchmarking. | Enterprise |
| **Manual approach** | Search creator name on X, Reddit, YouTube, TikTok. Categorize manually. | Free |

**For FundedNext:** Always check sentiment on at LEAST two platforms. A creator with great YouTube comments but toxic X mentions is a brand risk.

---

## 3. Like-to-Dislike Ratio Analysis

YouTube removed public dislikes in December 2021, but they still factor into satisfaction modeling.

**Interpretation benchmarks:**

| Like % | Assessment | Signal |
|---|---|---|
| 97–100% | Excellent | Strongly satisfies expectations |
| 95–97% | Very Good | Minimal negative reaction |
| 90–95% | Good | Normal range, healthy disagreement |
| 85–90% | Mixed | Investigate: over-promise? polarizing? quality dip? |
| 80–85% | Concerning | Misleading, low quality, or poorly handled topic |
| Below 80% | Poor | Actively rejected, likely algorithm-suppressed |

**Tools for viewing YouTube dislikes:**

| Tool | Type | Best For |
|---|---|---|
| **Return YouTube Dislike** (returnyoutubedislike.com) | Browser extension | Inline dislike estimates while browsing. Best overall. |
| **YouTube Dislike Viewer** (timeskip.io) | Website | Quick one-off checks via URL paste |
| **YouTube Studio** | Creator dashboard | 100% accurate for own videos |

**Usage in analysis:**
1. Check ratio via Return YouTube Dislike
2. Compare to creator baseline
3. Cross-reference with retention (low ratio + low retention = content-promise mismatch; low ratio + high retention = polarizing but people still watched)
4. Check comment sentiment alongside
5. For FundedNext: ratio below 90% on educational/trading content = trigger review

---

## 4. View Stats & Growth Metrics Framework

**Video-Level Growth Metrics:**

| Metric | What it measures | Why it matters |
|---|---|---|
| **View velocity** | Views accumulated in first 24h, 48h, 7 days | Algorithmic push strength indicator |
| **Impression-to-view (CTR)** | Impressions → views | Packaging effectiveness. High impressions + low CTR = bad packaging |
| **Traffic source mix** | Browse, Suggested, Search, External, Shorts feed | HOW the platform is distributing. Browse = homepage featuring. Search = lasting demand |
| **View-to-engagement ratio** | Views → likes, comments, shares, saves | Whether viewers cared enough to act |
| **Returning vs. new viewer split** | % from subscribers vs non-subscribers | Audience expansion. Outliers have higher non-subscriber % |
| **AVD trajectory** | How average view duration changes as video ages | Stable AVD at scale = true outlier |

**Channel-Level Growth Metrics:**

| Metric | What it measures | Why it matters |
|---|---|---|
| **Subscriber growth rate** | Net new per day/week/month | Fundamental growth curve. Spikes = viral content or events |
| **Views per video trend** | Average over last 10, 30, 90 days | Declining = losing algorithmic favor |
| **Engagement rate trend** | Engagement as % of views/followers over time | Declining even with growth = audience dilution |
| **Upload frequency vs. performance** | Posting cadence vs outcomes | Identifies optimal frequency |

**Growth Curve Patterns:**

| Pattern | Looks like | Means |
|---|---|---|
| **Hockey stick** | Flat → exponential | Viral moment or algorithm breakthrough |
| **Slow burn** | Gradual steady rise | SEO-driven, compounds over time |
| **Spike and decay** | Sharp peak → rapid decline | One-hit wonder, didn't convert to subscribers |
| **Plateau** | Growth stalls | Not reaching new audiences, needs experimentation |
| **Decline** | Consistent downward | Quality decline, algorithm penalty, or competitor displacement |

**Usage by mode:**
- **Mode C**: Compare outlier view velocity vs channel average. Check if outlier caused subscriber spike.
- **Mode E**: Pull competitor growth trajectory over 30/60/90 days. Cross-reference spikes with specific videos.
- **Mode F**: Check if viral video moved channel-level metrics. Viral without subscriber growth = packaging/content mismatch.

---

## 5. Analytics Tools Reference

| Tool | Platforms | What It Provides | Best For |
|---|---|---|---|
| **YouTube Studio** | YouTube | Views, watch time, CTR, traffic sources, subscriber growth, revenue, demographics | Own channel — most detailed source |
| **Social Blade** | YouTube, TikTok, Instagram, X | Growth charts, daily tracking, projections, estimated earnings, grades | Competitor growth tracking |
| **vidIQ** | YouTube | Real-time stats, keyword research, SEO scores, competitor scorecard, trending alerts | YouTube optimization + competitive intelligence |
| **TubeBuddy** | YouTube | A/B testing, channel health, SEO tools, bulk processing | Thumbnail/title testing at scale |
| **OutlierKit** | YouTube | Outlier detection, psychographic audience analysis, AI script analysis | Finding breakout videos and diagnosing why |
| **Metricool** | YT, TikTok, IG, X, LinkedIn | Cross-platform analytics, scheduling, competitor tracking | Unified multi-platform dashboard |
| **Socialinsider** | YT, TikTok, IG, LinkedIn | Engagement benchmarks, competitive analysis, industry comparison | Industry benchmarking for prop firm space |
| **Exolyt** | TikTok | TikTok-specific analytics, follower growth, sound tracking, sentiment | TikTok deep analytics |
| **Pentos** | TikTok | Trending content discovery, account growth tracking | TikTok competitive intelligence |
