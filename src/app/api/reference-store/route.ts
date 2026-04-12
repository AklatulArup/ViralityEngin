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

export async function GET() {
  const store = readStore();
  return Response.json(store);
}

export async function DELETE(request: NextRequest) {
  const { ids } = await request.json();
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return Response.json({ error: "ids array required" }, { status: 400 });
  }

  const store = readStore();
  const before = store.entries.length;
  const idSet = new Set(ids);
  store.entries = store.entries.filter((e) => !idSet.has(e.id));
  const removed = before - store.entries.length;

  store.lastUpdated = new Date().toISOString();
  writeStore(store);

  return Response.json({ success: true, removed, remaining: store.entries.length });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Support both single entry and batch array
  const entries: ReferenceEntry[] = Array.isArray(body) ? body : [body];

  if (entries.length === 0 || !entries[0].id) {
    return Response.json(
      { error: "Missing required fields: id, type" },
      { status: 400 }
    );
  }

  const store = readStore();
  let updated = 0;
  let added = 0;

  for (const entry of entries) {
    if (!entry.id || !entry.type) continue;
    const idx = store.entries.findIndex((e) => e.id === entry.id);
    if (idx >= 0) {
      store.entries[idx] = entry;
      updated++;
    } else {
      store.entries.push(entry);
      added++;
    }
  }

  store.lastUpdated = new Date().toISOString();
  writeStore(store);

  return Response.json({
    success: true,
    action: updated > 0 && added > 0 ? "mixed" : updated > 0 ? "updated" : "added",
    entryCount: store.entries.length,
    updated,
    added,
  });
}
