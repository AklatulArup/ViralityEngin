import type { TikTokVideoData } from "./types";

// ─── Column Name Mapping ───
// Supports common TikTok analytics export formats (Apify, Piloterr, native export, etc.)

const COLUMN_MAP: Record<string, string[]> = {
  url: ["url", "video_url", "video url", "link", "video_link"],
  views: ["views", "video_views", "video views", "plays", "view_count", "playcount"],
  likes: ["likes", "digg_count", "digg count", "hearts", "like_count", "likecount"],
  comments: ["comments", "comment_count", "comment count", "commentcount"],
  shares: ["shares", "share_count", "share count", "sharecount"],
  saves: ["saves", "bookmark_count", "bookmarks", "favorites", "collectcount"],
  duration: ["duration", "video_duration", "video duration", "length", "videoduration"],
  publishedAt: [
    "create_time", "createtime", "published_at", "date", "upload date",
    "posted", "publish_date", "created_at",
  ],
  caption: ["caption", "desc", "description", "title", "text", "video_description"],
  hashtags: ["hashtags", "challenges", "tags", "video_hashtags"],
  sound: ["sound_name", "music", "sound", "music_name", "musicname"],
  soundOriginal: ["sound_original", "original_sound", "is_original"],
  creator: ["author", "creator", "username", "handle", "author_name", "authorname"],
  followers: ["follower_count", "followers", "author_followers", "authorfollowers"],
  id: ["id", "video_id", "video id", "videoid"],
  thumbnail: ["thumbnail", "cover", "cover_url"],
};

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[_\s-]+/g, "").trim();
}

function matchColumn(header: string): string | null {
  const norm = normalizeHeader(header);
  for (const [field, variants] of Object.entries(COLUMN_MAP)) {
    for (const v of variants) {
      if (normalizeHeader(v) === norm) return field;
    }
  }
  return null;
}

function detectDelimiter(firstLine: string): string {
  const counts: Record<string, number> = { ",": 0, "\t": 0, ";": 0 };
  for (const char of firstLine) {
    if (char in counts) counts[char]++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
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
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseHashtags(raw: string): string[] {
  if (!raw) return [];
  // Handle JSON array format
  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.map((h: string | { name: string }) =>
            typeof h === "string" ? h.replace(/^#/, "") : h.name
          )
        : [];
    } catch {
      // fall through to string parsing
    }
  }
  // Handle comma or space separated
  return raw
    .split(/[,\s]+/)
    .map((h) => h.replace(/^#/, "").trim())
    .filter(Boolean);
}

function parseDuration(raw: string): number {
  if (!raw) return 0;
  const num = parseFloat(raw);
  if (!isNaN(num)) return Math.round(num);
  // Handle "MM:SS" or "HH:MM:SS"
  const parts = raw.split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function parseDate(raw: string): string {
  if (!raw) return new Date().toISOString();
  // Unix timestamp (seconds)
  const num = Number(raw);
  if (!isNaN(num) && num > 1e9 && num < 1e11) {
    return new Date(num * 1000).toISOString();
  }
  // Try standard date parsing
  const d = new Date(raw);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export interface CSVParseResult {
  videos: TikTokVideoData[];
  warnings: string[];
  detectedColumns: Record<string, string>;
  rowCount: number;
}

export function parseCSV(csvText: string): CSVParseResult {
  const warnings: string[] = [];

  // Strip BOM
  const cleaned = csvText.replace(/^\uFEFF/, "");
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim());

  if (lines.length < 2) {
    return { videos: [], warnings: ["CSV has no data rows"], detectedColumns: {}, rowCount: 0 };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCSVLine(lines[0], delimiter);

  // Map columns
  const columnMapping: Record<number, string> = {};
  const detectedColumns: Record<string, string> = {};

  headers.forEach((h, i) => {
    const field = matchColumn(h);
    if (field) {
      columnMapping[i] = field;
      detectedColumns[field] = h;
    }
  });

  // Check minimum required fields
  const mappedFields = Object.values(columnMapping);
  const hasViews = mappedFields.includes("views");
  const hasCaption = mappedFields.includes("caption");
  if (!hasViews) warnings.push("No 'views' column detected — defaulting to 0");

  const videos: TikTokVideoData[] = [];

  for (let rowIdx = 1; rowIdx < lines.length; rowIdx++) {
    const fields = parseCSVLine(lines[rowIdx], delimiter);
    if (fields.length === 0 || (fields.length === 1 && !fields[0])) continue;

    const row: Record<string, string> = {};
    for (const [idx, field] of Object.entries(columnMapping)) {
      row[field] = fields[Number(idx)] || "";
    }

    const durationSec = parseDuration(row.duration || "");
    const hashtags = parseHashtags(row.hashtags || "");
    const caption = row.caption || "";

    // Generate ID from URL hash or row index
    let id = row.id || "";
    if (!id && row.url) {
      const urlMatch = row.url.match(/\/video\/(\d+)/);
      id = urlMatch ? urlMatch[1] : `tiktok-${rowIdx}`;
    }
    if (!id) id = `tiktok-${rowIdx}`;

    videos.push({
      id,
      title: caption.slice(0, 200) || `TikTok video ${rowIdx}`,
      channel: row.creator || "Unknown",
      channelId: row.creator || `creator-${rowIdx}`,
      views: parseInt(row.views || "0") || 0,
      likes: parseInt(row.likes || "0") || 0,
      comments: parseInt(row.comments || "0") || 0,
      publishedAt: parseDate(row.publishedAt || ""),
      duration: formatDuration(durationSec),
      durationSeconds: durationSec,
      thumbnail: row.thumbnail || "",
      tags: hashtags,
      description: caption,
      platform: "tiktok",
      shares: parseInt(row.shares || "0") || 0,
      saves: parseInt(row.saves || "0") || 0,
      hashtags,
      soundName: row.sound || "",
      soundOriginal: row.soundOriginal === "true" || row.soundOriginal === "1",
      creatorHandle: row.creator || "",
      creatorFollowers: parseInt(row.followers || "0") || 0,
    });
  }

  if (videos.length === 0) {
    warnings.push("No valid rows parsed from CSV");
  }

  return {
    videos,
    warnings,
    detectedColumns,
    rowCount: lines.length - 1,
  };
}
