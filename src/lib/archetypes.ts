import type { Archetype, ArchetypeId } from "./types";

export const ARCHETYPES: Archetype[] = [
  {
    id: "challenge",
    label: "Challenge / Transformation",
    description: "Pass/fail stories, before/after, journey content",
    example: "I passed the FundedNext challenge in 3 days",
  },
  {
    id: "educational",
    label: "Educational / How-To",
    description: "Teaching a skill, explaining a concept, tutorial",
    example: "The only risk management strategy you need",
  },
  {
    id: "controversy",
    label: "Controversy / Hot Take",
    description: "Contrarian opinion, calling out bad practices, debate",
    example: "Why 90% of funded traders lose accounts",
  },
  {
    id: "data-proof",
    label: "Data / Proof",
    description: "Showing real results, account screenshots, P&L",
    example: "My exact trades — $4,200 profit breakdown",
  },
  {
    id: "emotional",
    label: "Emotional / Story",
    description: "Personal story, struggle, motivation, raw vulnerability",
    example: "I blew my funded account — here's what I learned",
  },
  {
    id: "reaction",
    label: "Reaction / Commentary",
    description: "Reacting to news, other creators, market events",
    example: "The market just crashed — here's what to do",
  },
  {
    id: "trend-riding",
    label: "Trend-Riding",
    description: "Using a trending format, sound, or topic",
    example: "Trading content using trending audio format",
  },
  {
    id: "comparison",
    label: "Comparison / Versus",
    description: "Comparing two things side by side",
    example: "FundedNext vs FTMO — which is better?",
  },
  {
    id: "myth-busting",
    label: "Myth-Busting",
    description: "Debunking common misconceptions",
    example: "Everything about prop firms is wrong",
  },
  {
    id: "behind-scenes",
    label: "Behind-the-Scenes",
    description: "Showing the real process, daily routine, workspace",
    example: "A day in my life as a funded trader",
  },
  {
    id: "list-ranking",
    label: "List / Ranking",
    description: "Top X, best of, ranked list",
    example: "Top 5 mistakes that blow your account",
  },
  {
    id: "utility",
    label: "Utility / Tool",
    description: "Template, checklist, calculator, resource",
    example: "Free trading journal template",
  },
];

// Simple keyword-based archetype detection from title and tags
const ARCHETYPE_PATTERNS: Record<ArchetypeId, RegExp[]> = {
  challenge: [
    /challenge/i,
    /pass(?:ed|ing)?/i,
    /fail(?:ed|ing)?/i,
    /transformation/i,
    /journey/i,
    /attempt/i,
  ],
  educational: [
    /how to/i,
    /tutorial/i,
    /guide/i,
    /learn/i,
    /strategy/i,
    /explained/i,
    /beginner/i,
    /course/i,
  ],
  controversy: [
    /why (?:most|90%|\d+%)/i,
    /truth about/i,
    /honest/i,
    /scam/i,
    /exposed/i,
    /wrong/i,
    /problem with/i,
  ],
  "data-proof": [
    /proof/i,
    /results/i,
    /profit/i,
    /\$[\d,]+/,
    /payout/i,
    /withdrawal/i,
    /breakdown/i,
    /my (?:exact|real)/i,
  ],
  emotional: [
    /blew/i,
    /lost/i,
    /story/i,
    /struggle/i,
    /gave up/i,
    /changed my life/i,
    /emotional/i,
  ],
  reaction: [
    /react/i,
    /crash/i,
    /breaking/i,
    /just happened/i,
    /market/i,
    /news/i,
    /update/i,
  ],
  "trend-riding": [/trend/i, /viral/i, /new/i],
  comparison: [
    /vs\.?/i,
    /versus/i,
    /compared/i,
    /better/i,
    /which/i,
    /difference/i,
  ],
  "myth-busting": [
    /myth/i,
    /wrong/i,
    /lie/i,
    /stop/i,
    /don'?t/i,
    /never/i,
    /everything .+ wrong/i,
  ],
  "behind-scenes": [
    /day in/i,
    /behind/i,
    /routine/i,
    /lifestyle/i,
    /setup/i,
    /workspace/i,
  ],
  "list-ranking": [
    /top \d+/i,
    /\d+ (?:best|worst|biggest|most)/i,
    /ranked/i,
    /tier list/i,
  ],
  utility: [
    /template/i,
    /free/i,
    /download/i,
    /tool/i,
    /resource/i,
    /checklist/i,
    /calculator/i,
  ],
};

export function detectArchetypes(
  title: string,
  tags: string[]
): ArchetypeId[] {
  const text = `${title} ${tags.join(" ")}`;
  const matches: ArchetypeId[] = [];

  for (const [id, patterns] of Object.entries(ARCHETYPE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        matches.push(id as ArchetypeId);
        break;
      }
    }
  }

  return matches.length > 0 ? matches : ["educational"]; // default fallback
}

export function getArchetype(id: ArchetypeId): Archetype | undefined {
  return ARCHETYPES.find((a) => a.id === id);
}
