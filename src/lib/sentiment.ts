// Simple rule-based sentiment analysis — no external API needed

const POSITIVE_WORDS = new Set([
  "love", "amazing", "great", "best", "awesome", "excellent", "perfect", "beautiful",
  "incredible", "fantastic", "wonderful", "brilliant", "outstanding", "superb", "blessed",
  "profitable", "profit", "funded", "passed", "payout", "winning", "success", "gained",
  "legit", "recommend", "worth", "reliable", "consistent", "easy", "helpful", "fast",
  "thank", "thanks", "grateful", "happy", "excited", "fire", "goat", "insane",
  "life-changing", "motivating", "inspiring", "working", "paid", "earned", "free",
]);

const NEGATIVE_WORDS = new Set([
  "scam", "fraud", "terrible", "worst", "awful", "horrible", "disgusting", "hate",
  "trash", "garbage", "waste", "useless", "fake", "lie", "lies", "liar", "steal",
  "stolen", "lost", "losing", "failed", "failure", "rigged", "manipulated", "cheat",
  "avoid", "warning", "beware", "complaint", "refund", "denied", "rejected", "banned",
  "slow", "bug", "broken", "glitch", "unfair", "overpriced", "expensive", "rip-off",
  "disappointed", "frustrating", "confusing", "misleading", "dishonest", "shady",
]);

const INTENSIFIERS = new Set(["very", "really", "so", "extremely", "absolutely", "totally", "completely"]);
const NEGATORS = new Set(["not", "no", "never", "don't", "doesn't", "didn't", "won't", "can't", "isn't", "wasn't"]);

export type Sentiment = "positive" | "negative" | "neutral";

export interface SentimentResult {
  sentiment: Sentiment;
  score: number; // -1 to 1
  positiveWords: string[];
  negativeWords: string[];
  confidence: number; // 0-1
}

export interface TitleSentimentAnalysis {
  overallSentiment: Sentiment;
  avgScore: number;
  distribution: { positive: number; negative: number; neutral: number };
  firmSentiment: { firm: string; sentiment: Sentiment; score: number; videoCount: number }[];
  topPositiveSignals: string[];
  topNegativeSignals: string[];
}

export function analyzeSentiment(text: string): SentimentResult {
  const words = text.toLowerCase().replace(/[^a-z\s'-]/g, " ").split(/\s+/).filter(Boolean);
  const positiveFound: string[] = [];
  const negativeFound: string[] = [];
  let score = 0;
  let negate = false;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    if (NEGATORS.has(word)) {
      negate = true;
      continue;
    }

    const multiplier = (i > 0 && INTENSIFIERS.has(words[i - 1])) ? 1.5 : 1;

    if (POSITIVE_WORDS.has(word)) {
      if (negate) {
        score -= multiplier;
        negativeFound.push(`not ${word}`);
      } else {
        score += multiplier;
        positiveFound.push(word);
      }
      negate = false;
    } else if (NEGATIVE_WORDS.has(word)) {
      if (negate) {
        score += multiplier * 0.5; // "not bad" = mildly positive
        positiveFound.push(`not ${word}`);
      } else {
        score -= multiplier;
        negativeFound.push(word);
      }
      negate = false;
    } else {
      // Reset negation after 2 words
      if (negate && i > 0) negate = false;
    }
  }

  // Normalize score to -1..1
  const maxScore = Math.max(positiveFound.length + negativeFound.length, 1);
  const normalizedScore = Math.max(-1, Math.min(1, score / maxScore));

  const sentiment: Sentiment =
    normalizedScore > 0.1 ? "positive" :
    normalizedScore < -0.1 ? "negative" :
    "neutral";

  const confidence = Math.min(1, (positiveFound.length + negativeFound.length) / 3);

  return {
    sentiment,
    score: Math.round(normalizedScore * 100) / 100,
    positiveWords: positiveFound,
    negativeWords: negativeFound,
    confidence: Math.round(confidence * 100) / 100,
  };
}

// Analyze sentiment across reference pool entries, grouped by prop firm
export function analyzePoolSentiment(
  entries: { name: string; tags?: string[]; channelName: string }[],
  competitors: string[]
): TitleSentimentAnalysis {
  const results = entries.map((e) => ({
    entry: e,
    result: analyzeSentiment(`${e.name} ${(e.tags || []).join(" ")}`),
  }));

  const positive = results.filter((r) => r.result.sentiment === "positive").length;
  const negative = results.filter((r) => r.result.sentiment === "negative").length;
  const neutral = results.filter((r) => r.result.sentiment === "neutral").length;
  const total = results.length || 1;

  const avgScore = Math.round(
    (results.reduce((s, r) => s + r.result.score, 0) / total) * 100
  ) / 100;

  const overallSentiment: Sentiment =
    avgScore > 0.1 ? "positive" : avgScore < -0.1 ? "negative" : "neutral";

  // Sentiment by prop firm
  const firmSentiment = competitors.map((firm) => {
    const firmLower = firm.toLowerCase();
    const firmResults = results.filter((r) => {
      const text = `${r.entry.name} ${(r.entry.tags || []).join(" ")}`.toLowerCase();
      return text.includes(firmLower);
    });
    if (firmResults.length === 0) return null;

    const firmAvg = firmResults.reduce((s, r) => s + r.result.score, 0) / firmResults.length;
    return {
      firm,
      sentiment: (firmAvg > 0.1 ? "positive" : firmAvg < -0.1 ? "negative" : "neutral") as Sentiment,
      score: Math.round(firmAvg * 100) / 100,
      videoCount: firmResults.length,
    };
  }).filter(Boolean) as { firm: string; sentiment: Sentiment; score: number; videoCount: number }[];

  // Aggregate top signals
  const allPositive = results.flatMap((r) => r.result.positiveWords);
  const allNegative = results.flatMap((r) => r.result.negativeWords);

  const posCount = new Map<string, number>();
  for (const w of allPositive) posCount.set(w, (posCount.get(w) || 0) + 1);
  const negCount = new Map<string, number>();
  for (const w of allNegative) negCount.set(w, (negCount.get(w) || 0) + 1);

  const topPositiveSignals = [...posCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word, count]) => `${word} (${count}x)`);

  const topNegativeSignals = [...negCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word, count]) => `${word} (${count}x)`);

  return {
    overallSentiment,
    avgScore,
    distribution: {
      positive: Math.round((positive / total) * 100),
      negative: Math.round((negative / total) * 100),
      neutral: Math.round((neutral / total) * 100),
    },
    firmSentiment: firmSentiment.sort((a, b) => b.score - a.score),
    topPositiveSignals,
    topNegativeSignals,
  };
}
