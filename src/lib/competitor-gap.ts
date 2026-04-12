import type { ReferenceEntry, CompetitorGap, CompetitorGapMatrix, KeywordBank } from "./types";

// Detect which prop firm a video is about (from title, tags, description proxy)
function detectPropFirmMention(entry: ReferenceEntry, competitors: string[]): string[] {
  const text = `${entry.name} ${(entry.tags || []).join(" ")}`.toLowerCase();
  return competitors.filter((comp) => text.includes(comp.toLowerCase()));
}

export function computeCompetitorGapMatrix(
  targetFirm: string,
  entries: ReferenceEntry[],
  bank: KeywordBank
): CompetitorGapMatrix {
  const competitors = bank.categories.competitors;
  if (competitors.length === 0 || entries.length === 0) {
    return {
      targetChannel: targetFirm,
      competitors: [],
      missingFormats: [],
      targetStrengths: [],
      opportunities: [],
    };
  }

  // Group entries by which prop firm they mention
  // A single video can mention multiple firms (e.g., "FTMO vs FundedNext")
  const byFirm = new Map<string, ReferenceEntry[]>();
  for (const comp of competitors) {
    byFirm.set(comp.toLowerCase(), []);
  }

  for (const e of entries) {
    const mentions = detectPropFirmMention(e, competitors);
    for (const firm of mentions) {
      const arr = byFirm.get(firm.toLowerCase()) || [];
      arr.push(e);
      byFirm.set(firm.toLowerCase(), arr);
    }
  }

  const targetKey = targetFirm.toLowerCase();
  const targetEntries = byFirm.get(targetKey) || [];

  // Build target's content type profile
  const targetContentTypes = new Set<string>();
  for (const e of targetEntries) {
    const text = `${e.name} ${(e.tags || []).join(" ")}`.toLowerCase();
    for (const ct of bank.categories.contentType) {
      if (text.includes(ct.toLowerCase())) targetContentTypes.add(ct);
    }
  }

  const targetAvgViews = targetEntries.length > 0
    ? targetEntries.reduce((s, e) => s + (e.metrics.views || 0), 0) / targetEntries.length
    : 0;

  // Build competitor gaps — each "competitor" is a prop firm, not a channel
  const gaps: CompetitorGap[] = [];

  for (const [firmKey, firmEntries] of byFirm) {
    if (firmKey === targetKey) continue;
    if (firmEntries.length < 1) continue;

    const avgViews = Math.round(
      firmEntries.reduce((s, e) => s + (e.metrics.views || 0), 0) / firmEntries.length
    );
    const vrsScores = firmEntries.filter((e) => e.metrics.vrsScore != null).map((e) => e.metrics.vrsScore!);
    const avgVRS = vrsScores.length > 0
      ? Math.round(vrsScores.reduce((s, v) => s + v, 0) / vrsScores.length)
      : 0;

    // Content types used by influencers promoting this firm
    const typeCounts = new Map<string, { count: number; totalViews: number }>();
    for (const e of firmEntries) {
      const text = `${e.name} ${(e.tags || []).join(" ")}`.toLowerCase();
      for (const ct of bank.categories.contentType) {
        if (text.includes(ct.toLowerCase())) {
          const existing = typeCounts.get(ct) || { count: 0, totalViews: 0 };
          existing.count++;
          existing.totalViews += e.metrics.views || 0;
          typeCounts.set(ct, existing);
        }
      }
    }

    const contentTypes = Array.from(typeCounts.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      avgViews: Math.round(data.totalViews / data.count),
    }));

    // Unique influencer channels promoting this firm
    const uniqueCreators = new Set(firmEntries.map((e) => e.channelName)).size;

    const uniqueFormats = contentTypes
      .map((ct) => ct.type)
      .filter((t) => !targetContentTypes.has(t));

    const strengthAreas = contentTypes
      .filter((ct) => ct.avgViews > targetAvgViews)
      .map((ct) => ct.type);

    const weaknessAreas = contentTypes
      .filter((ct) => ct.avgViews < targetAvgViews)
      .map((ct) => ct.type);

    // Find the display name (capitalize)
    const displayName = competitors.find((c) => c.toLowerCase() === firmKey) || firmKey;

    gaps.push({
      competitorName: `${displayName} (${uniqueCreators} creators, ${firmEntries.length} videos)`,
      totalVideos: firmEntries.length,
      avgViews,
      avgVRS,
      contentTypes,
      uniqueFormats,
      strengthAreas,
      weaknessAreas,
    });
  }

  gaps.sort((a, b) => b.avgViews - a.avgViews);
  const top10 = gaps.slice(0, 10);

  // Missing formats
  const allUnique = new Set<string>();
  for (const c of top10) {
    for (const f of c.uniqueFormats) allUnique.add(f);
  }

  // Target strengths
  const targetStrengths = Array.from(targetContentTypes).filter((ct) =>
    top10.every((c) => {
      const compType = c.contentTypes.find((t) => t.type === ct);
      return !compType || compType.avgViews < targetAvgViews;
    })
  );

  // Opportunities — framed for a partner manager
  const opportunities: string[] = [];

  // Compare video count (influencer reach)
  for (const c of top10.slice(0, 3)) {
    if (c.totalVideos > targetEntries.length) {
      opportunities.push(
        `${c.competitorName} has ${c.totalVideos} influencer videos vs ${targetEntries.length} for ${targetFirm} — recruit more creators`
      );
    }
  }

  // Compare content formats
  for (const c of top10.slice(0, 3)) {
    for (const ct of c.contentTypes.sort((a, b) => b.avgViews - a.avgViews).slice(0, 2)) {
      if (!targetContentTypes.has(ct.type)) {
        opportunities.push(
          `Creators making "${ct.type}" content about ${c.competitorName.split(" (")[0]} average ${ct.avgViews.toLocaleString()} views — brief your influencers to make ${ct.type} content about ${targetFirm}`
        );
      }
    }
  }

  // Compare avg performance
  const topPerformer = top10[0];
  if (topPerformer && topPerformer.avgViews > targetAvgViews * 1.5) {
    opportunities.push(
      `${topPerformer.competitorName.split(" (")[0]} influencer content averages ${topPerformer.avgViews.toLocaleString()} views vs ${Math.round(targetAvgViews).toLocaleString()} for ${targetFirm} — study their top creators' formats`
    );
  }

  if (opportunities.length === 0 && top10.length > 0) {
    opportunities.push(`${top10.length} competitor prop firms found — analyze their influencer content strategies for gaps`);
  }

  return {
    targetChannel: targetFirm,
    competitors: top10,
    missingFormats: Array.from(allUnique),
    targetStrengths,
    opportunities: opportunities.slice(0, 5),
  };
}
