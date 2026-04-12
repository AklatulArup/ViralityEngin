import { NextRequest } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { parseCSV } from "@/lib/csv-parser";

const STORE_PATH = join(process.cwd(), "src/data/tiktok-videos.json");

interface TikTokStore {
  version: number;
  lastUpdated: string;
  uploadCount: number;
  videos: unknown[];
}

function readStore(): TikTokStore {
  try {
    const raw = readFileSync(STORE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { version: 1, lastUpdated: "", uploadCount: 0, videos: [] };
  }
}

function writeStore(store: TikTokStore): void {
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
}

export async function GET() {
  const store = readStore();
  return Response.json(store);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("csv") as File | null;

  if (!file) {
    return Response.json({ error: "No CSV file provided" }, { status: 400 });
  }

  const csvText = await file.text();
  const result = parseCSV(csvText);

  if (result.videos.length === 0) {
    return Response.json(
      {
        error: "No valid videos parsed from CSV",
        warnings: result.warnings,
      },
      { status: 400 }
    );
  }

  // Replace previous data entirely (handles "constantly updated" requirement)
  const store: TikTokStore = {
    version: 1,
    lastUpdated: new Date().toISOString(),
    uploadCount: (readStore().uploadCount || 0) + 1,
    videos: result.videos,
  };

  writeStore(store);

  return Response.json({
    success: true,
    videoCount: result.videos.length,
    warnings: result.warnings,
    detectedColumns: result.detectedColumns,
    rowCount: result.rowCount,
    uploadCount: store.uploadCount,
  });
}
