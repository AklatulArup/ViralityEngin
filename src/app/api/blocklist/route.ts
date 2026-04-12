import { NextRequest } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { Blocklist, ReferenceStore } from "@/lib/types";

const BLOCKLIST_PATH = join(process.cwd(), "src/data/blocklist.json");
const STORE_PATH = join(process.cwd(), "src/data/reference-store.json");

function readBlocklist(): Blocklist {
  try {
    return JSON.parse(readFileSync(BLOCKLIST_PATH, "utf-8"));
  } catch {
    return { version: 1, lastUpdated: "", channels: [], creators: [] };
  }
}

function writeBlocklist(b: Blocklist): void {
  writeFileSync(BLOCKLIST_PATH, JSON.stringify(b, null, 2), "utf-8");
}

function readStore(): ReferenceStore {
  try {
    return JSON.parse(readFileSync(STORE_PATH, "utf-8"));
  } catch {
    return { version: 1, lastUpdated: "", entries: [] };
  }
}

function writeStore(s: ReferenceStore): void {
  writeFileSync(STORE_PATH, JSON.stringify(s, null, 2), "utf-8");
}

export async function GET() {
  return Response.json(readBlocklist());
}

/**
 * POST /api/blocklist
 * Body: { channels?: string[], creators?: string[], purgeReferences?: boolean }
 * Adds channels/creators to the blocklist. If purgeReferences=true, also removes
 * all reference store entries matching those channels/creators.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const channels: string[] = Array.isArray(body.channels) ? body.channels : [];
  const creators: string[] = Array.isArray(body.creators)
    ? body.creators.map((c: string) => c.toLowerCase().trim()).filter(Boolean)
    : [];

  const blocklist = readBlocklist();
  const channelSet = new Set(blocklist.channels);
  const creatorSet = new Set(blocklist.creators);

  for (const c of channels) {
    if (c && c.trim()) channelSet.add(c.trim());
  }
  for (const c of creators) creatorSet.add(c);

  blocklist.channels = [...channelSet];
  blocklist.creators = [...creatorSet];
  blocklist.lastUpdated = new Date().toISOString();
  writeBlocklist(blocklist);

  let purged = 0;
  if (body.purgeReferences) {
    const store = readStore();
    const before = store.entries.length;
    store.entries = store.entries.filter((e) => {
      if (channelSet.has(e.channelId)) return false;
      if (creatorSet.has((e.channelName || "").toLowerCase())) return false;
      return true;
    });
    purged = before - store.entries.length;
    if (purged > 0) {
      store.lastUpdated = new Date().toISOString();
      writeStore(store);
    }
  }

  return Response.json({
    success: true,
    blocklist,
    purged,
  });
}

/**
 * DELETE /api/blocklist
 * Body: { channels?: string[], creators?: string[] }
 * Removes entries from the blocklist (un-blocks).
 */
export async function DELETE(request: NextRequest) {
  const body = await request.json();
  const channels: string[] = Array.isArray(body.channels) ? body.channels : [];
  const creators: string[] = Array.isArray(body.creators)
    ? body.creators.map((c: string) => c.toLowerCase().trim())
    : [];

  const blocklist = readBlocklist();
  const channelSet = new Set(channels);
  const creatorSet = new Set(creators);

  blocklist.channels = blocklist.channels.filter((c) => !channelSet.has(c));
  blocklist.creators = blocklist.creators.filter((c) => !creatorSet.has(c));
  blocklist.lastUpdated = new Date().toISOString();
  writeBlocklist(blocklist);

  return Response.json({ success: true, blocklist });
}
