// /api/youtube/comments?videoId=... [&max=20]
//
// Fetches top comments for a YouTube video via the Data API.
// Used by the sentiment pipeline; also usable anywhere else that needs comments.

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
// Reads `videoId` from request.url query — cannot be statically rendered.
// Next.js caches responses in the edge data cache per-URL up to the
// revalidate window, so practical cache behaviour is unchanged.
export const dynamic = "force-dynamic";
export const revalidate = 3600; // cache 1 hour (data-cache side)

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const videoId = url.searchParams.get("videoId");
    const max = Math.min(100, Math.max(1, parseInt(url.searchParams.get("max") ?? "20", 10)));

    if (!videoId) {
      return NextResponse.json({ ok: false, error: "videoId required" }, { status: 400 });
    }

    const key = process.env.YOUTUBE_API_KEY ?? process.env.YOUTUBE_API_KEY_2;
    if (!key) {
      return NextResponse.json({ ok: false, reason: "no_api_key" });
    }

    const apiUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${encodeURIComponent(videoId)}&maxResults=${max}&order=relevance&key=${key}`;
    const r = await fetch(apiUrl, { cache: "force-cache" });

    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      // Comments disabled on some videos = 403
      if (r.status === 403 && errText.includes("commentsDisabled")) {
        return NextResponse.json({ ok: false, reason: "comments_disabled", comments: [] });
      }
      return NextResponse.json({ ok: false, reason: "api_error", status: r.status });
    }

    const data = await r.json();
    const comments: string[] = (data?.items ?? [])
      .map((item: { snippet?: { topLevelComment?: { snippet?: { textDisplay?: string } } } }) =>
        item?.snippet?.topLevelComment?.snippet?.textDisplay ?? "")
      .filter((t: string) => t.length > 0)
      .map((t: string) => stripHtml(t));

    return NextResponse.json({ ok: true, comments });
  } catch (e) {
    console.error("[api/youtube/comments]", e);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}
