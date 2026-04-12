import type { TitleVariant, KeywordBank } from "./types";

const POWER_WORDS = [
  "secret", "shocking", "exposed", "how to", "why", "don't", "stop", "never",
  "actually", "finally", "truth", "real", "insane", "crazy", "impossible",
  "ultimate", "proven", "guaranteed", "warning", "banned", "hack", "trick",
];

const CURIOSITY_PHRASES = [
  "why .* don't", "what happens", "the truth about", "you won't believe",
  "nobody tells", "what .* didn't", "here's why", "the real reason",
  "no one talks about", "they don't want", "you need to know",
];

const EMOTIONAL_WORDS = [
  "lost", "quit", "changed my life", "blew up", "broke", "rich", "failed",
  "dream", "journey", "struggle", "painful", "fired", "bankrupt", "millionaire",
  "freedom", "escape", "grind", "hustle",
];

function countMatches(text: string, words: string[]): number {
  const lower = text.toLowerCase();
  return words.filter((w) => lower.includes(w)).length;
}

function regexMatches(text: string, patterns: string[]): number {
  const lower = text.toLowerCase();
  return patterns.filter((p) => new RegExp(p, "i").test(lower)).length;
}

export function scoreTitleVariant(title: string, bank: KeywordBank): TitleVariant {
  const lower = title.toLowerCase();
  const wordCount = title.split(/\s+/).length;

  // 1. Hook strength (power words, question marks, exclamations)
  const powerCount = countMatches(lower, POWER_WORDS);
  const hasQuestion = title.includes("?");
  const hookStrength = Math.min(100, powerCount * 25 + (hasQuestion ? 20 : 0));

  // 2. Curiosity gap
  const curiosityCount = regexMatches(lower, CURIOSITY_PHRASES);
  const curiosityGap = Math.min(100, curiosityCount * 40 + (hasQuestion ? 15 : 0));

  // 3. Number presence
  const hasNumber = /\d/.test(title);
  const hasDollar = /\$/.test(title);
  const hasPercent = /%/.test(title);
  const numberPresence = hasNumber ? (hasDollar || hasPercent ? 100 : 80) : 30;

  // 4. Length optimal
  const len = title.length;
  const lengthOptimal = len >= 40 && len <= 65 ? 100 : len >= 30 && len <= 80 ? 70 : 40;

  // 5. Keyword density
  const nicheMatches = bank.categories.niche.filter((kw) => lower.includes(kw.toLowerCase())).length;
  const keywordDensity = nicheMatches >= 3 ? 100 : nicheMatches >= 2 ? 85 : nicheMatches >= 1 ? 65 : 20;

  // 6. Emotional pull
  const emotionalCount = countMatches(lower, EMOTIONAL_WORDS);
  const emotionalPull = Math.min(100, emotionalCount * 30);

  // 7. Clarity
  const clarityScore = wordCount >= 5 && wordCount <= 12 ? 100 : wordCount >= 3 && wordCount <= 15 ? 70 : 40;

  // Weighted average
  const score = Math.round(
    hookStrength * 0.25 +
    curiosityGap * 0.20 +
    numberPresence * 0.15 +
    lengthOptimal * 0.10 +
    keywordDensity * 0.15 +
    emotionalPull * 0.10 +
    clarityScore * 0.05
  );

  // Feedback
  const feedback: string[] = [];
  const dims = [
    { name: "hook words", val: hookStrength, tip: "Add power words like 'secret', 'exposed', 'truth', or end with a question" },
    { name: "curiosity gap", val: curiosityGap, tip: "Create incomplete information — 'The truth about X that nobody tells you'" },
    { name: "numbers", val: numberPresence, tip: "Include a specific number, dollar amount, or percentage for credibility" },
    { name: "length", val: lengthOptimal, tip: "Aim for 40-65 characters — short enough to display fully, long enough to be descriptive" },
    { name: "niche keywords", val: keywordDensity, tip: "Include relevant niche keywords for search discoverability" },
    { name: "emotional pull", val: emotionalPull, tip: "Add emotional triggers — 'quit', 'dream', 'changed my life', 'failed'" },
  ];
  dims.sort((a, b) => a.val - b.val);
  for (const d of dims.slice(0, 3)) {
    if (d.val < 70) feedback.push(d.tip);
  }
  if (feedback.length === 0) feedback.push("Strong title — consider testing against a variant with a different hook style");

  return {
    title,
    score,
    breakdown: { hookStrength, curiosityGap, numberPresence, lengthOptimal, keywordDensity, emotionalPull, clarityScore },
    feedback,
  };
}

export function generateTitleVariants(topic: string, bank: KeywordBank): TitleVariant[] {
  const topicClean = topic.replace(/[^\w\s]/g, "").trim();
  const nicheWord = bank.categories.niche[0] || "trading";

  const variants = [
    `$5,000 in 24 Hours: How I ${topicClean} with ${nicheWord}`,
    `Why Do 90% of Traders Fail at ${topicClean}?`,
    `The Truth About ${topicClean} That Nobody Tells You`,
    `How I ${topicClean} as a Funded Trader (Real Results)`,
    `${topicClean} Is Dead. Here's What Actually Works in ${nicheWord}`,
  ];

  return variants
    .map((v) => scoreTitleVariant(v, bank))
    .sort((a, b) => b.score - a.score);
}
