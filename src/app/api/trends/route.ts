import { NextRequest, NextResponse } from "next/server";

// google-trends-api is a CommonJS module
// eslint-disable-next-line @typescript-eslint/no-require-imports
const googleTrends = require("google-trends-api");

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("keyword");
  const geo = req.nextUrl.searchParams.get("geo") || ""; // empty = worldwide
  const category = req.nextUrl.searchParams.get("category") || "0"; // 0 = all categories

  if (!keyword) {
    return NextResponse.json({ error: "keyword parameter required" }, { status: 400 });
  }

  try {
    // Interest over time (last 12 months)
    const interestRaw = await googleTrends.interestOverTime({
      keyword,
      startTime: new Date(Date.now() - 365 * 86400000),
      geo,
      category: parseInt(category),
    });
    const interestData = JSON.parse(interestRaw);
    const timeline = (interestData.default?.timelineData || []).map(
      (point: { formattedTime: string; value: number[] }) => ({
        date: point.formattedTime,
        value: point.value[0] || 0,
      })
    );

    // Trend direction
    const recent = timeline.slice(-4);
    const older = timeline.slice(-12, -4);
    const recentAvg = recent.length > 0 ? recent.reduce((s: number, p: { value: number }) => s + p.value, 0) / recent.length : 0;
    const olderAvg = older.length > 0 ? older.reduce((s: number, p: { value: number }) => s + p.value, 0) / older.length : 0;
    const trend = recentAvg > olderAvg * 1.15 ? "rising" : recentAvg < olderAvg * 0.85 ? "declining" : "stable";

    // Related queries
    let relatedQueries: { query: string; value: number }[] = [];
    try {
      const relatedRaw = await googleTrends.relatedQueries({ keyword, geo });
      const relatedData = JSON.parse(relatedRaw);
      const topQueries = relatedData.default?.rankedList?.[0]?.rankedKeyword || [];
      relatedQueries = topQueries.slice(0, 10).map((q: { query: string; value: number }) => ({
        query: q.query,
        value: q.value,
      }));
    } catch {
      // Related queries can fail silently
    }

    return NextResponse.json({
      keyword,
      geo: geo || "worldwide",
      timeline,
      trend,
      currentInterest: recent[recent.length - 1]?.value || 0,
      peakInterest: Math.max(...timeline.map((p: { value: number }) => p.value), 0),
      relatedQueries,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Google Trends API error" },
      { status: 500 }
    );
  }
}

// Batch: compare multiple keywords
export async function POST(req: NextRequest) {
  try {
    const { keywords, geo } = await req.json();
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json({ error: "keywords array required" }, { status: 400 });
    }

    // Compare up to 5 keywords
    const compareKeywords = keywords.slice(0, 5);
    const comparisonRaw = await googleTrends.interestOverTime({
      keyword: compareKeywords,
      startTime: new Date(Date.now() - 365 * 86400000),
      geo: geo || "",
    });
    const comparisonData = JSON.parse(comparisonRaw);
    const timeline = (comparisonData.default?.timelineData || []).map(
      (point: { formattedTime: string; value: number[] }) => ({
        date: point.formattedTime,
        values: point.value,
      })
    );

    // Summary per keyword
    const summaries = compareKeywords.map((kw: string, i: number) => {
      const values = timeline.map((p: { values: number[] }) => p.values[i] || 0);
      const recent = values.slice(-4);
      const avg = recent.length > 0 ? recent.reduce((s: number, v: number) => s + v, 0) / recent.length : 0;
      const peak = Math.max(...values, 0);
      return { keyword: kw, currentAvg: Math.round(avg), peak };
    });

    return NextResponse.json({
      keywords: compareKeywords,
      timeline,
      summaries,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Google Trends comparison error" },
      { status: 500 }
    );
  }
}
