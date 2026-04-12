import type { DescriptionSEO, KeywordBank } from "./types";

const CTA_PHRASES = [
  "subscribe", "like", "comment", "share", "follow", "click", "check out",
  "link in", "join", "sign up", "download", "grab", "get started", "tap",
  "hit the bell", "notification",
];

export function analyzeDescriptionSEO(
  description: string,
  title: string,
  bank: KeywordBank
): DescriptionSEO {
  const lower = description.toLowerCase();
  const words = description.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Keyword density
  const keywordCounts: { keyword: string; count: number; density: number }[] = [];
  for (const kw of bank.categories.niche) {
    const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const matches = description.match(regex);
    if (matches && matches.length > 0) {
      keywordCounts.push({
        keyword: kw,
        count: matches.length,
        density: Math.round((matches.length / Math.max(wordCount, 1)) * 10000) / 100,
      });
    }
  }
  keywordCounts.sort((a, b) => b.count - a.count);

  // Timestamps
  const hasTimestamps = /\d{1,2}:\d{2}/.test(description);

  // Links
  const hasLinks = /https?:\/\//.test(description);

  // CTA
  const hasCTA = CTA_PHRASES.some((p) => lower.includes(p));

  // Hashtags
  const hashtags = description.match(/#\w+/g) || [];
  const hasHashtags = hashtags.length > 0;

  // Above-the-fold (first ~200 chars)
  const aboveFold = description.slice(0, 200).split("\n").slice(0, 2).join(" ").trim();
  let aboveFoldScore = 0;
  const aboveFoldLower = aboveFold.toLowerCase();
  // Hook words in above fold
  const hookWords = ["free", "secret", "learn", "discover", "watch", "exclusive", "new", "inside"];
  if (hookWords.some((w) => aboveFoldLower.includes(w))) aboveFoldScore += 30;
  // Niche keyword in above fold
  if (bank.categories.niche.some((kw) => aboveFoldLower.includes(kw.toLowerCase()))) aboveFoldScore += 30;
  // CTA in above fold
  if (CTA_PHRASES.some((p) => aboveFoldLower.includes(p))) aboveFoldScore += 20;
  // Short and punchy (under 150 chars for first line)
  if (aboveFold.length > 0 && aboveFold.length <= 150) aboveFoldScore += 20;

  // Overall score
  const keywordScore = keywordCounts.length >= 3 ? 100 : keywordCounts.length >= 2 ? 75 : keywordCounts.length >= 1 ? 50 : 10;
  const lengthScore = wordCount >= 200 && wordCount <= 500 ? 100 : wordCount >= 100 && wordCount <= 1000 ? 70 : 40;
  const structureScore =
    (hasTimestamps ? 35 : 0) + (hasLinks ? 35 : 0) + (hasCTA ? 30 : 0);
  const hashtagScore =
    hashtags.length >= 3 && hashtags.length <= 5 ? 100 :
    hashtags.length >= 1 && hashtags.length <= 10 ? 60 : 20;

  const overallScore = Math.round(
    keywordScore * 0.25 +
    lengthScore * 0.15 +
    structureScore * 0.20 +
    aboveFoldScore * 0.25 +
    hashtagScore * 0.15
  );

  // Issues
  const issues: string[] = [];
  if (!hasTimestamps) issues.push("No timestamps/chapters found — chapters boost search visibility and watch time");
  if (wordCount < 100) issues.push(`Description too short (${wordCount} words) — aim for 200-500 words`);
  if (!hasCTA) issues.push("No call-to-action detected — add subscribe/like/comment prompts");
  if (keywordCounts.length === 0) issues.push("No niche keywords found in description");
  if (aboveFoldScore < 40) issues.push("Above-the-fold text is weak — first 2 lines should hook and include keywords");
  if (!hasLinks) issues.push("No links found — add relevant video/playlist/social links");
  if (hashtags.length === 0) issues.push("No hashtags — add 3-5 relevant hashtags");
  if (hashtags.length > 10) issues.push(`Too many hashtags (${hashtags.length}) — YouTube may flag as spam, use 3-5`);

  // Suggestions
  const suggestions: string[] = [];
  if (!hasTimestamps) suggestions.push("Add timestamps (0:00 Intro, 1:23 Strategy, etc.) for chapter markers");
  if (wordCount < 200) suggestions.push("Expand description with keyword-rich content explaining the video");
  if (!hasCTA) suggestions.push("Add a CTA in the first 2 lines: 'Subscribe for daily trading content'");
  if (keywordCounts.length < 2) suggestions.push(`Include niche keywords naturally: ${bank.categories.niche.slice(0, 5).join(", ")}`);
  if (aboveFoldScore < 50) suggestions.push("Rewrite first 2 lines as a hook — this is what viewers see before clicking 'show more'");
  if (!hasLinks) suggestions.push("Add links to related videos, playlists, and your social media profiles");

  return {
    overallScore,
    keywordDensity: keywordCounts.slice(0, 10),
    hasTimestamps,
    hasLinks,
    hasCTA,
    hasHashtags,
    aboveFoldHook: aboveFold,
    aboveFoldScore,
    wordCount,
    issues,
    suggestions,
  };
}
