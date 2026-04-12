import type { ReferenceEntry, UploadCadenceEntry, UploadCadenceResult } from "./types";

function getCadenceLabel(avgDays: number): string {
  if (avgDays <= 1.5) return "Daily";
  if (avgDays <= 3.5) return "2-3x/week";
  if (avgDays <= 8) return "Weekly";
  if (avgDays <= 15) return "Bi-weekly";
  return "Monthly+";
}

export function computeUploadCadence(entries: ReferenceEntry[]): UploadCadenceResult {
  // Group by channel
  const byChannel = new Map<string, ReferenceEntry[]>();
  for (const e of entries) {
    if (!e.channelName || !e.analyzedAt) continue;
    const arr = byChannel.get(e.channelName) || [];
    arr.push(e);
    byChannel.set(e.channelName, arr);
  }

  const cadenceEntries: UploadCadenceEntry[] = [];

  for (const [channelName, channelEntries] of byChannel) {
    if (channelEntries.length < 3) continue;

    // Sort by date
    const sorted = [...channelEntries].sort(
      (a, b) => new Date(a.analyzedAt).getTime() - new Date(b.analyzedAt).getTime()
    );

    // Compute gaps in days
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const diff = (new Date(sorted[i].analyzedAt).getTime() - new Date(sorted[i - 1].analyzedAt).getTime()) / 86400000;
      if (diff > 0) gaps.push(diff);
    }

    if (gaps.length === 0) continue;

    const avgDays = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    const mean = avgDays;
    const variance = gaps.reduce((s, g) => s + (g - mean) ** 2, 0) / gaps.length;
    const stddev = Math.sqrt(variance);
    const consistency = Math.max(0, Math.min(1, 1 - stddev / (mean || 1)));

    const avgViews =
      channelEntries.reduce((s, e) => s + (e.metrics.views || 0), 0) / channelEntries.length;

    cadenceEntries.push({
      channelName,
      avgDaysBetweenUploads: Math.round(avgDays * 10) / 10,
      consistency: Math.round(consistency * 100) / 100,
      totalUploads: channelEntries.length,
      avgViews: Math.round(avgViews),
      cadenceLabel: getCadenceLabel(avgDays),
    });
  }

  cadenceEntries.sort((a, b) => b.avgViews - a.avgViews);

  // Pearson correlation between consistency and avgViews
  let correlation = 0;
  if (cadenceEntries.length >= 3) {
    const n = cadenceEntries.length;
    const meanC = cadenceEntries.reduce((s, e) => s + e.consistency, 0) / n;
    const meanV = cadenceEntries.reduce((s, e) => s + e.avgViews, 0) / n;
    let num = 0, denC = 0, denV = 0;
    for (const e of cadenceEntries) {
      const dc = e.consistency - meanC;
      const dv = e.avgViews - meanV;
      num += dc * dv;
      denC += dc * dc;
      denV += dv * dv;
    }
    const den = Math.sqrt(denC * denV);
    correlation = den > 0 ? Math.round((num / den) * 100) / 100 : 0;
  }

  return {
    entries: cadenceEntries,
    bestCadence: cadenceEntries[0]?.cadenceLabel || "N/A",
    bestCadenceAvgViews: cadenceEntries[0]?.avgViews || 0,
    correlation,
  };
}
