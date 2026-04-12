import type { KeywordBank } from "./types";

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "is", "it", "this", "that", "was", "are", "be",
  "has", "had", "do", "does", "did", "will", "would", "could", "should",
  "may", "might", "can", "not", "no", "so", "if", "then", "than",
  "from", "up", "out", "as", "how", "all", "each", "every", "both",
  "few", "more", "most", "other", "some", "such", "only", "own", "same",
  "too", "very", "just", "about", "above", "after", "again", "here",
  "there", "when", "where", "why", "what", "which", "who", "whom",
  "my", "your", "his", "her", "its", "our", "their", "me", "him",
  "us", "them", "i", "you", "he", "she", "we", "they",
  // Spanish stop words
  "el", "la", "los", "las", "un", "una", "es", "de", "en", "por",
  "con", "para", "como", "pero", "que", "del", "al", "se", "su",
  "mi", "tu", "yo", "te", "lo", "le", "nos", "les", "si", "no",
  "ya", "mas", "muy", "tan", "hay",
  // Common short words
  "vs", "pt", "ep", "ok", "lol", "omg",
]);

function normalize(word: string): string {
  return word
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, "")
    .trim();
}

// Extract meaningful keywords from text
export function extractKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  // Deduplicate
  return [...new Set(words)];
}

// Check if a video matches any keyword in the bank
export function matchesKeywordBank(
  bank: KeywordBank,
  title: string,
  description: string,
  tags: string[]
): { matches: string[]; categories: string[] } {
  const text = `${title} ${description} ${tags.join(" ")}`.toLowerCase();
  const allKeywords = [
    ...bank.categories.niche,
    ...bank.categories.competitors,
    ...bank.categories.contentType,
  ];

  const matches: string[] = [];
  const categories: string[] = [];

  for (const kw of allKeywords) {
    if (text.includes(kw.toLowerCase())) {
      matches.push(kw);
      if (bank.categories.niche.includes(kw)) categories.push("niche");
      if (bank.categories.competitors.includes(kw)) categories.push("competitors");
      if (bank.categories.contentType.includes(kw)) categories.push("contentType");
    }
  }

  return { matches: [...new Set(matches)], categories: [...new Set(categories)] };
}

// Check if a tag is semantically related to existing niche keywords
function isNicheRelevant(tag: string, existingNiche: string[]): boolean {
  const lower = tag.toLowerCase();

  // Check if the tag shares a word with any existing niche keyword
  const tagWords = lower.split(/\s+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  for (const kw of existingNiche) {
    const kwWords = kw.toLowerCase().split(/\s+/);
    // Direct substring match (e.g., "forex" in "forex scalping")
    if (lower.includes(kw) || kw.includes(lower)) return true;
    // Shared word match (e.g., "gold trading" shares "trading" with "trading challenge")
    for (const tw of tagWords) {
      for (const kw2 of kwWords) {
        if (tw === kw2 && tw.length > 3) return true;
      }
    }
  }
  return false;
}

// Expand the keyword bank with new keywords from a video
// Only adds tags that are semantically related to existing niche keywords
export function expandKeywordBank(
  bank: KeywordBank,
  title: string,
  description: string,
  tags: string[]
): { bank: KeywordBank; newKeywords: string[] } {
  const updated = { ...bank, categories: { ...bank.categories } };
  const newKeywords: string[] = [];

  // First check if this video is relevant to the niche at all
  const { matches } = matchesKeywordBank(bank, title, description, tags);
  const videoIsNicheRelevant = matches.length >= 1;

  // Extract from tags — only add tags related to existing niche
  for (const tag of tags) {
    const normalized = normalize(tag);
    if (
      normalized.length > 2 &&
      !STOP_WORDS.has(normalized) &&
      !updated.categories.niche.includes(normalized) &&
      !updated.categories.competitors.includes(normalized) &&
      !updated.categories.contentType.includes(normalized)
    ) {
      const isContentType = /tutorial|review|challenge|strategy|live|analysis|news|reaction|vlog|education|beginner|advanced/i.test(normalized);

      if (isContentType) {
        updated.categories.contentType = [...updated.categories.contentType, normalized];
        newKeywords.push(normalized);
      } else if (videoIsNicheRelevant && isNicheRelevant(normalized, updated.categories.niche)) {
        // Only add to niche if the video itself is niche-relevant AND the tag relates to existing niche keywords
        updated.categories.niche = [...updated.categories.niche, normalized];
        newKeywords.push(normalized);
      }
      // Tags that don't match niche relevance are silently skipped
    }
  }

  // Extract 2-word phrases from title that contain niche keywords
  const titleWords = title.toLowerCase().split(/\s+/);
  for (let i = 0; i < titleWords.length - 1; i++) {
    const phrase = `${titleWords[i]} ${titleWords[i + 1]}`.replace(/[^a-z0-9\s]/gi, "").trim();
    if (
      phrase.length > 5 &&
      !updated.categories.niche.includes(phrase) &&
      updated.categories.niche.some((kw) => phrase.includes(kw))
    ) {
      updated.categories.niche = [...updated.categories.niche, phrase];
      newKeywords.push(phrase);
    }
  }

  if (newKeywords.length > 0) {
    updated.lastUpdated = new Date().toISOString();
  }

  return { bank: updated, newKeywords };
}
