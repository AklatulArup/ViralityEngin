import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const QUEUE_PATH = join(process.cwd(), "src/data/instagram-queue.json");

interface InstagramEntry {
  id: string;
  input: string; // raw URL or handle
  type: "url" | "handle";
  addedAt: string;
  source: "manual" | "csv";
}

interface InstagramQueue {
  version: number;
  lastUpdated: string;
  entries: InstagramEntry[];
}

function readQueue(): InstagramQueue {
  try {
    return JSON.parse(readFileSync(QUEUE_PATH, "utf-8"));
  } catch {
    return { version: 1, lastUpdated: "", entries: [] };
  }
}

function writeQueue(q: InstagramQueue): void {
  q.lastUpdated = new Date().toISOString();
  writeFileSync(QUEUE_PATH, JSON.stringify(q, null, 2), "utf-8");
}

function parseInput(raw: string): { input: string; type: "url" | "handle" } {
  const t = raw.trim();
  if (t.startsWith("http")) return { input: t, type: "url" };
  return { input: t.replace(/^@/, ""), type: "handle" };
}

export async function GET() {
  return Response.json(readQueue());
}

// POST: add one or more URLs/handles
export async function POST(request: Request) {
  const body = await request.json();
  const inputs: string[] = Array.isArray(body.inputs)
    ? body.inputs
    : [body.input].filter(Boolean);

  const queue = readQueue();
  const added: InstagramEntry[] = [];

  for (const raw of inputs) {
    const { input, type } = parseInput(raw);
    if (!input) continue;
    const exists = queue.entries.some((e) => e.input === input);
    if (!exists) {
      const entry: InstagramEntry = {
        id: `ig_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        input,
        type,
        addedAt: new Date().toISOString(),
        source: body.source || "manual",
      };
      queue.entries.push(entry);
      added.push(entry);
    }
  }

  writeQueue(queue);
  return Response.json({ success: true, added: added.length, total: queue.entries.length });
}

// DELETE: remove by id
export async function DELETE(request: Request) {
  const { id } = await request.json();
  const queue = readQueue();
  queue.entries = queue.entries.filter((e) => e.id !== id);
  writeQueue(queue);
  return Response.json({ success: true, total: queue.entries.length });
}
