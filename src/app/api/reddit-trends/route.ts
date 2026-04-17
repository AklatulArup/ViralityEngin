import { NextRequest, NextResponse } from "next/server";

// Reddit Trends API route — reads prop firm / trading subreddits for early trend signals
// Uses Reddit's public JSON API — NO API KEY NEEDED for read-only public subreddit data
// Reddit requires a User-Agent header but no authentication for public endpoints
//
// Rate limit: ~60 requests/minute on public API. We cache aggressively (30 min).
// For higher limits: register an app at https://www.reddit.com/prefs/apps (free)
// and use OAuth2 with REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET env vars.

const SUBREDDITS = [
  "Forex",
  "Daytrading",
  "PropFirm",           // dedicated prop firm subreddit
  "algotrading",
  "Fidelity",           // broader finance audience
  "Entrepreneur",       // bridge niche for FN content
  "passive_income",     // bridge niche
];

let cache: { posts: RedditPost[]; fetchedAt: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export interface RedditPost {
  id: string;
  title: string;
  subreddit: string;
  url: string;
  score: number;
  numComments: number;
  hoursOld: number;
  flair: string;
  sentiment: "positive" | "negative" | "neutral";
  isRelevantToFN: boolean;   // mentions prop firms, challenges, funded accounts
  signalStrength: "early" | "rising" | "peaked"; // lifecycle stage
  topCommentSnippet: string;
}

const PROP_FIRM_KEYWORDS = [
  "prop firm", "funded trader", "funded account", "challenge", "drawdown",
  "ftmo", "fundednext", "the5ers", "e8", "myforexfunds", "apex", "topstep",
  "passing", "failing", "payout", "profit target", "evaluation",
];

const NEGATIVE_KEYWORDS = [
  "scam", "fraud", "banned", "refused", "stolen", "cheat", "manipulate",
  "avoid", "warning", "beware", "terrible", "worst", "fake",
];

function detectSentiment(title: string, flair: string): RedditPost["sentiment"] {
  const t = (title + " " + flair).toLowerCase();
  const negScore = NEGATIVE_KEYWORDS.filter(k => t.includes(k)).length;
  const posScore = ["passed", "funded", "payout", "profit", "success", "finally", "approved"].filter(k => t.includes(k)).length;
  if (negScore > posScore) return "negative";
  if (posScore > negScore) return "positive";
  return "neutral";
}

function isRelevantToFN(title: string): boolean {
  const t = title.toLowerCase();
  return PROP_FIRM_KEYWORDS.some(k => t.includes(k));
}

function detectSignalStrength(score: number, numComments: number, hoursOld: number): RedditPost["signalStrength"] {
  const velocity = score / Math.max(1, hoursOld);
  if (velocity > 50 && hoursOld < 6) return "early";
  if (velocity > 20 || (score > 100 && hoursOld < 24)) return "rising";
  return "peaked";
}

async function fetchSubreddit(subreddit: string, limit = 15): Promise<RedditPost[]> {
  const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "ViralyEngine/1.0 (content intelligence; contact@fundednext.com)",
    },
    next: { revalidate: 1800 }, // 30 min Next.js cache
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error(`Reddit rate limit on r/${subreddit}`);
    throw new Error(`Reddit fetch failed for r/${subreddit}: ${res.status}`);
  }

  const data = await res.json();
  const posts: RedditPost[] = [];

  for (const child of data?.data?.children ?? []) {
    const p = child.data;
    if (p.stickied) continue; // skip mod posts

    const hoursOld = Math.round((Date.now() - p.created_utc * 1000) / 3600000);
    const sentiment = detectSentiment(p.title, p.link_flair_text ?? "");

    posts.push({
      id: p.id,
      title: p.title,
      subreddit: p.subreddit,
      url: `https://reddit.com${p.permalink}`,
      score: p.score,
      numComments: p.num_comments,
      hoursOld,
      flair: p.link_flair_text ?? "",
      sentiment,
      isRelevantToFN: isRelevantToFN(p.title),
      signalStrength: detectSignalStrength(p.score, p.num_comments, hoursOld),
      topCommentSnippet: "", // would need separate fetch with OAuth for comments
    });
  }

  return posts;
}

export async function GET(req: NextRequest) {
  const forceRefresh = req.nextUrl.searchParams.get("refresh") === "1";
  const subreddit = req.nextUrl.searchParams.get("sub"); // optional specific subreddit

  if (!forceRefresh && cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
    return NextResponse.json({ posts: cache.posts, cached: true });
  }

  const targets = subreddit ? [subreddit] : SUBREDDITS;
  const allPosts: RedditPost[] = [];
  const errors: string[] = [];

  // Fetch all subreddits with a small delay between to avoid rate limits
  for (const sub of targets) {
    try {
      const posts = await fetchSubreddit(sub, 10);
      allPosts.push(...posts);
      await new Promise(r => setTimeout(r, 200)); // 200ms between requests
    } catch (e) {
      errors.push(String(e));
    }
  }

  // Sort: FN-relevant first, then by signal strength, then by score
  allPosts.sort((a, b) => {
    if (a.isRelevantToFN !== b.isRelevantToFN) return a.isRelevantToFN ? -1 : 1;
    const sigOrd = { early: 0, rising: 1, peaked: 2 };
    if (a.signalStrength !== b.signalStrength) return sigOrd[a.signalStrength] - sigOrd[b.signalStrength];
    return b.score - a.score;
  });

  cache = { posts: allPosts, fetchedAt: Date.now() };

  // Derive trend summary for the engine
  const fnRelevant = allPosts.filter(p => p.isRelevantToFN);
  const negativeSignals = fnRelevant.filter(p => p.sentiment === "negative");
  const earlySignals = allPosts.filter(p => p.signalStrength === "early");

  const trendSummary = {
    totalPosts: allPosts.length,
    fnRelevantCount: fnRelevant.length,
    negativeSignalCount: negativeSignals.length,
    earlySignalCount: earlySignals.length,
    topEarlySignals: earlySignals.slice(0, 3).map(p => p.title),
    sentimentHealth: negativeSignals.length > fnRelevant.length * 0.3 ? "concerning" : "healthy",
    reputationAlert: negativeSignals.some(p => /fundednext|fn /i.test(p.title)),
  };

  return NextResponse.json({
    posts: allPosts,
    trendSummary,
    cached: false,
    errors: errors.length > 0 ? errors : undefined,
    note: "Using Reddit public API — no authentication required. For higher rate limits, add REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET env vars.",
  });
}
