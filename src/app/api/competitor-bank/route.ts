import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const BANK_PATH = join(process.cwd(), "src/data/competitors.json");

export interface Competitor {
  name: string;
  space: string;
  handles: {
    youtube?: string;
    instagram?: string;
    tiktok?: string;
    x?: string;
    linkedin?: string;
  };
}

function readBank(): Competitor[] {
  try {
    return JSON.parse(readFileSync(BANK_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function writeBank(data: Competitor[]): void {
  writeFileSync(BANK_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function GET() {
  return Response.json(readBank());
}

// POST: add or update a competitor (match by name, case-insensitive)
export async function POST(request: Request) {
  const body: Competitor = await request.json();
  if (!body.name?.trim()) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }
  const bank = readBank();
  const idx = bank.findIndex(
    (c) => c.name.toLowerCase() === body.name.toLowerCase()
  );
  if (idx >= 0) {
    bank[idx] = { ...bank[idx], ...body };
  } else {
    bank.push({
      name: body.name.trim(),
      space: body.space?.trim() || "Prop firm",
      handles: body.handles || {},
    });
  }
  writeBank(bank);
  return Response.json({ success: true, count: bank.length });
}

// DELETE: remove by name
export async function DELETE(request: Request) {
  const { name } = await request.json();
  if (!name) return Response.json({ error: "name is required" }, { status: 400 });
  const bank = readBank();
  const filtered = bank.filter(
    (c) => c.name.toLowerCase() !== name.toLowerCase()
  );
  writeBank(filtered);
  return Response.json({ success: true, count: filtered.length });
}
