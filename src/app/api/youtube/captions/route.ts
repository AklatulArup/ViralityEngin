import { NextRequest, NextResponse } from "next/server";

// youtube-captions-scraper fetches auto-generated captions without OAuth
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getSubtitles } = require("youtube-captions-scraper");

interface CaptionLine {
  start: string;
  dur: string;
  text: string;
}

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get("id");
  const lang = req.nextUrl.searchParams.get("lang") || "en";

  if (!videoId) {
    return NextResponse.json({ error: "id parameter required" }, { status: 400 });
  }

  try {
    const captions: CaptionLine[] = await getSubtitles({
      videoID: videoId,
      lang,
    });

    if (!captions || captions.length === 0) {
      return NextResponse.json({ error: "No captions available", videoId }, { status: 404 });
    }

    // Full transcript
    const fullText = captions.map((c: CaptionLine) => c.text).join(" ");

    // Hook analysis (first 15 seconds)
    const hookLines = captions.filter((c: CaptionLine) => parseFloat(c.start) < 15);
    const hookText = hookLines.map((c: CaptionLine) => c.text).join(" ");

    // Word count and speaking rate
    const words = fullText.split(/\s+/).filter(Boolean);
    const totalDuration = captions.length > 0
      ? parseFloat(captions[captions.length - 1].start) + parseFloat(captions[captions.length - 1].dur)
      : 0;
    const wordsPerMinute = totalDuration > 0 ? Math.round((words.length / totalDuration) * 60) : 0;

    // Keyword density (top 20 meaningful words)
    const stopWords = new Set(["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "is", "it", "this", "that", "was", "are", "be", "has", "had", "do", "so", "if", "you", "i", "we", "they", "he", "she", "my", "your", "his", "her", "our", "their", "me", "him", "us", "them", "what", "which", "who", "will", "can", "just", "like", "know", "going", "get", "got", "would"]);
    const wordCounts = new Map<string, number>();
    for (const w of words) {
      const lower = w.toLowerCase().replace(/[^a-z]/g, "");
      if (lower.length > 2 && !stopWords.has(lower)) {
        wordCounts.set(lower, (wordCounts.get(lower) || 0) + 1);
      }
    }
    const topKeywords = [...wordCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, count]) => ({ word, count, density: Math.round((count / words.length) * 10000) / 100 }));

    // CTA detection in transcript
    const ctaPhrases = ["subscribe", "like", "comment", "share", "link in", "check out", "follow", "click", "join", "sign up", "description"];
    const ctaFound = ctaPhrases.filter((p) => fullText.toLowerCase().includes(p));

    // Structure detection (based on topic shifts)
    const segments = [];
    const segmentSize = Math.floor(captions.length / 4);
    for (let i = 0; i < 4; i++) {
      const start = i * segmentSize;
      const end = i === 3 ? captions.length : (i + 1) * segmentSize;
      const segText = captions.slice(start, end).map((c: CaptionLine) => c.text).join(" ");
      const segStart = captions[start] ? parseFloat(captions[start].start) : 0;
      segments.push({
        quarter: i + 1,
        startTime: Math.round(segStart),
        wordCount: segText.split(/\s+/).length,
        preview: segText.slice(0, 100),
      });
    }

    return NextResponse.json({
      videoId,
      language: lang,
      totalWords: words.length,
      totalDuration: Math.round(totalDuration),
      wordsPerMinute,
      hookText,
      hookWordCount: hookText.split(/\s+/).filter(Boolean).length,
      topKeywords,
      ctaFound,
      segments,
      fullTranscript: fullText.slice(0, 5000), // Cap at 5000 chars
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Caption fetch failed", videoId },
      { status: 500 }
    );
  }
}
