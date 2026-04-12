import type { ReferenceEntry, NicheRanking, KeywordBank, DetectedLanguage } from "./types";
import { matchesKeywordBank } from "./keyword-bank";
import { detectReferenceLanguage, getLanguageLabel } from "./language-detect";

interface RankedEntry extends ReferenceEntry {
  language: DetectedLanguage;
}

// Filter reference entries that match the niche based on keyword bank
function filterNicheEntries(
  entries: ReferenceEntry[],
  bank: KeywordBank
): RankedEntry[] {
  return entries
    .filter((e) => e.type === "video" && e.metrics.views !== undefined)
    .filter((e) => {
      const { matches } = matchesKeywordBank(
        bank,
        e.name,
        "", // no description in reference entries
        e.tags || []
      );
      return matches.length > 0;
    })
    .map((e) => ({
      ...e,
      language: detectReferenceLanguage(e),
    }));
}

// Compute where a video ranks against the niche
export function computeNicheRanking(
  videoTitle: string,
  videoViews: number,
  videoVRS: number,
  videoEngagement: number,
  videoChannelName: string,
  allEntries: ReferenceEntry[],
  bank: KeywordBank
): NicheRanking | null {
  const nicheEntries = filterNicheEntries(allEntries, bank);
  if (nicheEntries.length < 2) return null;

  // Sort by views for rank
  const byViews = [...nicheEntries].sort(
    (a, b) => (b.metrics.views || 0) - (a.metrics.views || 0)
  );
  const byVRS = [...nicheEntries].sort(
    (a, b) => (b.metrics.vrsScore || 0) - (a.metrics.vrsScore || 0)
  );
  const byEng = [...nicheEntries].sort(
    (a, b) => (b.metrics.engagement || 0) - (a.metrics.engagement || 0)
  );

  // Find rank (1-based, lower = better)
  const viewRank = byViews.findIndex((e) => (e.metrics.views || 0) <= videoViews) + 1 || byViews.length + 1;
  const vrsRank = byVRS.findIndex((e) => (e.metrics.vrsScore || 0) <= videoVRS) + 1 || byVRS.length + 1;
  const engRank = byEng.findIndex((e) => (e.metrics.engagement || 0) <= videoEngagement) + 1 || byEng.length + 1;

  const total = nicheEntries.length + 1; // +1 for the current video

  // Percentile (100 = top, 0 = bottom)
  const percentileViews = Math.round(((total - viewRank) / total) * 100);
  const percentileVRS = Math.round(((total - vrsRank) / total) * 100);

  // Language-specific rankings
  const langGroups: Record<string, RankedEntry[]> = {};
  for (const e of nicheEntries) {
    if (!langGroups[e.language]) langGroups[e.language] = [];
    langGroups[e.language].push(e);
  }

  const videoLang = "en"; // Will be detected from actual video in dashboard
  const languageRankings = Object.entries(langGroups)
    .filter(([, entries]) => entries.length >= 1)
    .map(([lang, entries]) => {
      const sorted = entries.sort((a, b) => (b.metrics.views || 0) - (a.metrics.views || 0));
      const rank = sorted.findIndex((e) => (e.metrics.views || 0) <= videoViews) + 1 || sorted.length + 1;
      return {
        language: lang as DetectedLanguage,
        label: getLanguageLabel(lang as DetectedLanguage),
        rank,
        total: entries.length + (lang === videoLang ? 1 : 0),
      };
    })
    .sort((a, b) => b.total - a.total);

  // Creator rankings (group by channel)
  const creatorMap: Record<string, { views: number[]; vrs: number[]; name: string }> = {};
  for (const e of nicheEntries) {
    const name = e.channelName;
    if (!creatorMap[name]) creatorMap[name] = { views: [], vrs: [], name };
    if (e.metrics.views) creatorMap[name].views.push(e.metrics.views);
    if (e.metrics.vrsScore) creatorMap[name].vrs.push(e.metrics.vrsScore);
  }

  // Add current video's creator
  if (!creatorMap[videoChannelName]) {
    creatorMap[videoChannelName] = { views: [], vrs: [], name: videoChannelName };
  }
  creatorMap[videoChannelName].views.push(videoViews);
  creatorMap[videoChannelName].vrs.push(videoVRS);

  const creatorRankings = Object.values(creatorMap)
    .map((c) => ({
      channelName: c.name,
      avgViews: Math.round(c.views.reduce((s, v) => s + v, 0) / c.views.length),
      avgVRS: c.vrs.length > 0 ? Math.round(c.vrs.reduce((s, v) => s + v, 0) / c.vrs.length) : 0,
      videoCount: c.views.length,
      rank: 0,
    }))
    .sort((a, b) => b.avgViews - a.avgViews)
    .map((c, i) => ({ ...c, rank: i + 1 }));

  return {
    videoTitle,
    videoViews,
    videoVRS,
    totalNicheVideos: total,
    rankByViews: viewRank,
    rankByVRS: vrsRank,
    rankByEngagement: engRank,
    percentileViews,
    percentileVRS,
    languageRankings,
    creatorRankings: creatorRankings.slice(0, 20),
  };
}
