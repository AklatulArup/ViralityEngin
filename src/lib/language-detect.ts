import type { DetectedLanguage, LanguageCPA, EnrichedVideo, ReferenceEntry } from "./types";

const LANGUAGE_LABELS: Record<DetectedLanguage, string> = {
  en: "English",
  es: "Spanish",
  ar: "Arabic",
  pt: "Portuguese",
  fr: "French",
  de: "German",
  hi: "Hindi",
  id: "Indonesian",
  tr: "Turkish",
  other: "Other",
};

// Language detection heuristics based on character patterns and common words
const LANGUAGE_PATTERNS: { lang: DetectedLanguage; words: RegExp; chars?: RegExp }[] = [
  { lang: "ar", chars: /[\u0600-\u06FF]/, words: /\b(في|من|على|هذا|الذي|مع|كيف|لماذا|التداول)\b/i },
  { lang: "hi", chars: /[\u0900-\u097F]/, words: /\b(है|के|में|का|की|से|और|हिंदी)\b/i },
  { lang: "es", words: /\b(como|porque|cuando|donde|también|mejor|pero|para|con|esto|qué|cómo|fondea|dinero|ganar|forex|trading|propias|cuenta)\b/i },
  { lang: "pt", words: /\b(como|porque|quando|também|melhor|para|com|isso|dinheiro|conta|mercado|negociação)\b/i },
  { lang: "fr", words: /\b(comment|pourquoi|quand|aussi|meilleur|pour|avec|argent|compte|trading)\b/i },
  { lang: "de", words: /\b(wie|warum|wann|auch|besser|für|mit|geld|konto|handel)\b/i },
  { lang: "id", words: /\b(bagaimana|mengapa|kapan|juga|untuk|dengan|uang|akun|perdagangan)\b/i },
  { lang: "tr", words: /\b(nasıl|neden|ne zaman|için|ile|para|hesap|ticaret)\b/i },
];

export function detectLanguage(title: string, description?: string): DetectedLanguage {
  const text = `${title} ${(description || "").slice(0, 500)}`;

  // Check character-based patterns first (Arabic, Hindi)
  for (const { lang, chars } of LANGUAGE_PATTERNS) {
    if (chars && chars.test(text)) return lang;
  }

  // Check word-based patterns
  // Count matches per language and pick the one with most matches
  let bestLang: DetectedLanguage = "en";
  let bestCount = 0;

  for (const { lang, words } of LANGUAGE_PATTERNS) {
    const matches = text.match(new RegExp(words.source, "gi"));
    const count = matches?.length || 0;
    if (count > bestCount) {
      bestCount = count;
      bestLang = lang;
    }
  }

  // If no non-English patterns match significantly, default to English
  if (bestCount < 2) {
    // Check for English common words as confirmation
    const engCount = (text.match(/\b(the|and|but|how|why|what|this|that|with|from|have|been|will|your|you|can|get|got|make|take)\b/gi) || []).length;
    if (engCount >= 2) return "en";
    // Very short text with no clear language — default to English
    return bestCount > 0 ? bestLang : "en";
  }

  return bestLang;
}

export function getLanguageLabel(lang: DetectedLanguage): string {
  return LANGUAGE_LABELS[lang];
}

// Compute language-based Content Performance Analysis
export function computeLanguageCPA(
  videos: EnrichedVideo[]
): LanguageCPA[] {
  const langMap: Record<string, EnrichedVideo[]> = {};

  for (const v of videos) {
    const lang = detectLanguage(v.title, v.description);
    if (!langMap[lang]) langMap[lang] = [];
    langMap[lang].push(v);
  }

  return Object.entries(langMap)
    .map(([lang, vids]) => {
      const best = vids.reduce((a, b) => (a.views > b.views ? a : b));
      return {
        language: lang as DetectedLanguage,
        label: LANGUAGE_LABELS[lang as DetectedLanguage] || lang,
        videoCount: vids.length,
        avgViews: Math.round(vids.reduce((s, v) => s + v.views, 0) / vids.length),
        avgEngagement: parseFloat((vids.reduce((s, v) => s + v.engagement, 0) / vids.length).toFixed(2)),
        avgVRS: Math.round(vids.reduce((s, v) => s + v.vrs.estimatedFullScore, 0) / vids.length),
        topVideo: { title: best.title, views: best.views },
      };
    })
    .sort((a, b) => b.videoCount - a.videoCount);
}

// Detect language from reference entry (uses name/tags)
export function detectReferenceLanguage(entry: ReferenceEntry): DetectedLanguage {
  return detectLanguage(entry.name, entry.tags?.join(" "));
}
