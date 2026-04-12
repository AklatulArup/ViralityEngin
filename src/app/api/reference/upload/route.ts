import { NextRequest } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { ReferenceStore, ReferenceEntry } from "@/lib/types";

const STORE_PATH = join(process.cwd(), "src/data/reference-store.json");

function readStore(): ReferenceStore {
  try {
    const raw = readFileSync(STORE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { version: 1, lastUpdated: "", entries: [] };
  }
}

function writeStore(store: ReferenceStore): void {
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
}

// Parse a simple CSV line handling quoted fields
function parseLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function detectDelimiter(line: string): string {
  const counts: Record<string, number> = { ",": 0, "\t": 0, ";": 0 };
  for (const ch of line) {
    if (ch in counts) counts[ch]++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

// Extract video ID from YouTube URL
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // bare ID
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// Flexible column matching
const COL_MAP: Record<string, string[]> = {
  url: ["url", "video_url", "link", "youtube_url", "video_link"],
  title: ["title", "name", "video_title", "caption", "desc", "description"],
  channel: ["channel", "channel_name", "creator", "author", "username", "handle"],
  channelId: ["channel_id", "channelid"],
  views: ["views", "view_count", "video_views", "plays"],
  likes: ["likes", "like_count", "hearts"],
  comments: ["comments", "comment_count"],
  publishedAt: ["published_at", "publishedat", "date", "posted", "create_time", "upload_date"],
  tags: ["tags", "keywords", "hashtags"],
  duration: ["duration", "video_duration", "length"],
};

function findColumn(headers: string[], target: string): number {
  const candidates = COL_MAP[target] || [target];
  for (const c of candidates) {
    const idx = headers.findIndex(
      (h) => h.toLowerCase().replace(/[^a-z0-9]/g, "") === c.replace(/[^a-z0-9]/g, "")
    );
    if (idx >= 0) return idx;
  }
  return -1;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("csv") as File | null;

    if (!file) {
      return Response.json({ error: "No CSV file provided" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());

    if (lines.length < 2) {
      return Response.json({ error: "CSV must have header + at least 1 row" }, { status: 400 });
    }

    const delimiter = detectDelimiter(lines[0]);
    const headers = parseLine(lines[0], delimiter).map((h) => h.toLowerCase().trim());

    const urlIdx = findColumn(headers, "url");
    const titleIdx = findColumn(headers, "title");
    const channelIdx = findColumn(headers, "channel");
    const channelIdIdx = findColumn(headers, "channelId");
    const viewsIdx = findColumn(headers, "views");
    const likesIdx = findColumn(headers, "likes");
    const commentsIdx = findColumn(headers, "comments");
    const publishedIdx = findColumn(headers, "publishedAt");
    const tagsIdx = findColumn(headers, "tags");

    const store = readStore();
    const existingIds = new Set(store.entries.map((e) => e.id));

    let added = 0;
    let skippedDuplicates = 0;
    let skippedInvalid = 0;
    const warnings: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const fields = parseLine(lines[i], delimiter);
      if (fields.length < 2) continue;

      // Try to get video ID
      let videoId: string | null = null;
      if (urlIdx >= 0 && fields[urlIdx]) {
        videoId = extractVideoId(fields[urlIdx]);
      }

      // If no URL column, try to use title as a fallback ID
      if (!videoId && titleIdx >= 0 && fields[titleIdx]) {
        videoId = `ref-${fields[titleIdx].slice(0, 30).replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${i}`;
      }

      if (!videoId) {
        skippedInvalid++;
        continue;
      }

      // Check for duplicates
      if (existingIds.has(videoId)) {
        skippedDuplicates++;
        continue;
      }

      const title = titleIdx >= 0 ? fields[titleIdx] || "" : "";
      const channel = channelIdx >= 0 ? fields[channelIdx] || "" : "";
      const channelId = channelIdIdx >= 0 ? fields[channelIdIdx] || "" : channel;
      const views = viewsIdx >= 0 ? parseInt(fields[viewsIdx]) || 0 : 0;
      const likes = likesIdx >= 0 ? parseInt(fields[likesIdx]) || 0 : 0;
      const commentCount = commentsIdx >= 0 ? parseInt(fields[commentsIdx]) || 0 : 0;
      const publishedAt = publishedIdx >= 0 ? fields[publishedIdx] || "" : "";

      let tags: string[] = [];
      if (tagsIdx >= 0 && fields[tagsIdx]) {
        try {
          tags = JSON.parse(fields[tagsIdx]);
        } catch {
          tags = fields[tagsIdx].split(/[,;|]/).map((t) => t.trim()).filter(Boolean);
        }
      }

      const engagement = views > 0 ? ((likes + commentCount) / views) * 100 : 0;
      const daysOld = publishedAt
        ? Math.max(1, (Date.now() - new Date(publishedAt).getTime()) / 86_400_000)
        : 30;
      const vel = Math.round(views / daysOld);

      const entry: ReferenceEntry = {
        id: videoId,
        type: "video",
        platform: "youtube",
        name: title || `Video ${videoId}`,
        channelId: channelId || "unknown",
        channelName: channel || "Unknown",
        analyzedAt: new Date().toISOString(),
        metrics: {
          views,
          velocity: vel,
          engagement: parseFloat(engagement.toFixed(2)),
          vrsScore: 0, // Will be computed if video is analyzed individually
        },
        tags: tags.slice(0, 15),
      };

      store.entries.push(entry);
      existingIds.add(videoId);
      added++;
    }

    if (added > 0) {
      store.lastUpdated = new Date().toISOString();
      writeStore(store);
    }

    if (skippedDuplicates > 0) {
      warnings.push(`${skippedDuplicates} duplicate entries skipped`);
    }
    if (skippedInvalid > 0) {
      warnings.push(`${skippedInvalid} rows skipped (no valid video ID or URL)`);
    }

    return Response.json({
      success: true,
      added,
      skippedDuplicates,
      skippedInvalid,
      totalEntries: store.entries.length,
      warnings,
      detectedColumns: headers.filter((_, i) => [urlIdx, titleIdx, channelIdx, viewsIdx].includes(i)),
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 }
    );
  }
}
