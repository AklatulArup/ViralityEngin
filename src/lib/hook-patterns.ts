import type { ReferenceEntry, HookPattern, HookPatternLibrary } from "./types";

interface PatternDef {
  id: string;
  label: string;
  regex: RegExp;
  templates: string[];
}

const PATTERN_DEFS: PatternDef[] = [
  {
    id: "number",
    label: "Number Hook",
    regex: /(\$[\d,]+|^\d+|\d+\s*(ways|steps|tips|things|reasons|mistakes|secrets))/i,
    templates: ["$_____ in _____ Days", "X Ways to _____ as a Trader", "I Made $_____ Trading _____"],
  },
  {
    id: "question",
    label: "Question Hook",
    regex: /^(why|how|what|can|is|do|does|will|should)\b|\?$/i,
    templates: ["Why Do _____ Fail at _____?", "How Does _____ Actually Work?", "What Happens When You _____?"],
  },
  {
    id: "curiosity",
    label: "Curiosity Gap",
    regex: /(truth about|nobody tells|won't believe|secret|exposed|what happened|watch till|didn't expect)/i,
    templates: ["The Truth About _____ Nobody Tells You", "What Happened When I _____", "_____ Exposed: The Real Story"],
  },
  {
    id: "authority",
    label: "Authority / Proof",
    regex: /(i made|i earned|my first|how i|proof|real results|real account|live\s+trad)/i,
    templates: ["How I _____ in _____ Days (Proof)", "My First _____ as a Funded Trader", "Real Results: _____ Live"],
  },
  {
    id: "controversy",
    label: "Controversy",
    regex: /(dead|scam|worst|stop\s+\w+ing|don't|never|overrated|\bvs\b)/i,
    templates: ["_____ Is Dead. Here's Why.", "Stop _____ — Do This Instead", "_____ vs _____ : The Truth"],
  },
  {
    id: "emotional",
    label: "Emotional",
    regex: /(quit|lost|changed|dream|life|broke|rich|journey|story|struggle|fired)/i,
    templates: ["I Quit _____ to Become a _____", "How _____ Changed My Life", "From Broke to _____ : My Journey"],
  },
  {
    id: "list",
    label: "List / Ranking",
    regex: /(top\s+\d|best\s+\d|\d+\s+best|ranked|tier\s+list)/i,
    templates: ["Top X _____ for Traders", "Best _____ Ranked", "_____ Tier List"],
  },
  {
    id: "urgency",
    label: "Urgency",
    regex: /(before it's too late|right now|today|hurry|limited|last chance|don't miss)/i,
    templates: ["Do This Before _____", "_____ Is Changing — Act Now", "Last Chance to _____"],
  },
  {
    id: "pov",
    label: "POV / Relatable",
    regex: /(pov|when you|that moment|every trader|relatable|literally me)/i,
    templates: ["POV: You Just _____ Your First _____", "When You _____ and _____", "Every Trader When _____"],
  },
  {
    id: "instructional",
    label: "Instructional",
    regex: /(how to|guide|tutorial|step by step|beginner|for beginners|learn)/i,
    templates: ["How to _____ Step by Step", "Complete _____ Guide for Beginners", "Learn _____ in _____ Minutes"],
  },
];

export function analyzeHookPatterns(entries: ReferenceEntry[]): HookPatternLibrary {
  const validEntries = entries.filter((e) => e.name && e.metrics.views != null);
  if (validEntries.length === 0) {
    return { patterns: [], totalVideosAnalyzed: 0, bestPattern: "N/A", worstPattern: "N/A" };
  }

  // Overall median
  const allViews = validEntries.map((e) => e.metrics.views!).sort((a, b) => a - b);
  const overallMedian = allViews[Math.floor(allViews.length / 2)];
  const outlierThreshold = overallMedian * 3;

  const patterns: HookPattern[] = [];

  for (const def of PATTERN_DEFS) {
    const matching = validEntries.filter((e) => def.regex.test(e.name));
    if (matching.length === 0) continue;

    const views = matching.map((e) => e.metrics.views!);
    const avgViews = Math.round(views.reduce((s, v) => s + v, 0) / views.length);
    const engagements = matching
      .filter((e) => e.metrics.engagement != null)
      .map((e) => e.metrics.engagement!);
    const avgEngagement = engagements.length > 0
      ? Math.round((engagements.reduce((s, v) => s + v, 0) / engagements.length) * 10) / 10
      : 0;
    const outliers = matching.filter((e) => e.metrics.views! > outlierThreshold);
    const outlierRate = Math.round((outliers.length / matching.length) * 100);

    // Top 3 examples sorted by views
    const examples = [...matching]
      .sort((a, b) => (b.metrics.views || 0) - (a.metrics.views || 0))
      .slice(0, 3)
      .map((e) => e.name);

    patterns.push({
      pattern: def.label,
      examples,
      videoCount: matching.length,
      avgViews,
      avgEngagement,
      outlierRate,
      templates: def.templates,
    });
  }

  patterns.sort((a, b) => b.avgViews - a.avgViews);

  return {
    patterns,
    totalVideosAnalyzed: validEntries.length,
    bestPattern: patterns[0]?.pattern || "N/A",
    worstPattern: patterns[patterns.length - 1]?.pattern || "N/A",
  };
}
