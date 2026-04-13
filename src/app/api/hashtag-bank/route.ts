import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const BANK_PATH = join(process.cwd(), "src/data/hashtag-bank.json");

interface HashtagBank {
  version: number;
  lastUpdated: string;
  categories: {
    viral: string[];
    brand: string[];
    niche: string[];
    campaign: string[];
  };
}

function readBank(): HashtagBank {
  try {
    return JSON.parse(readFileSync(BANK_PATH, "utf-8"));
  } catch {
    return {
      version: 1,
      lastUpdated: "",
      categories: { viral: [], brand: [], niche: [], campaign: [] },
    };
  }
}

function writeBank(bank: HashtagBank): void {
  bank.lastUpdated = new Date().toISOString();
  writeFileSync(BANK_PATH, JSON.stringify(bank, null, 2), "utf-8");
}

function normalizeTag(tag: string): string {
  const t = tag.trim();
  return t.startsWith("#") ? t.toLowerCase() : `#${t.toLowerCase()}`;
}

export async function GET() {
  return Response.json(readBank());
}

export async function POST(request: Request) {
  const body = await request.json();
  const bank = readBank();

  for (const cat of ["viral", "brand", "niche", "campaign"] as const) {
    if (Array.isArray(body[cat])) {
      for (const tag of body[cat] as string[]) {
        const normalized = normalizeTag(tag);
        if (normalized.length > 1 && !bank.categories[cat].includes(normalized)) {
          bank.categories[cat].push(normalized);
        }
      }
    }
  }

  writeBank(bank);
  return Response.json({ success: true, counts: Object.fromEntries(
    Object.entries(bank.categories).map(([k, v]) => [k, v.length])
  )});
}

export async function DELETE(request: Request) {
  const body = await request.json();
  const bank = readBank();

  for (const cat of ["viral", "brand", "niche", "campaign"] as const) {
    if (Array.isArray(body[cat])) {
      const removeSet = new Set((body[cat] as string[]).map(normalizeTag));
      bank.categories[cat] = bank.categories[cat].filter((t) => !removeSet.has(t));
    }
  }

  writeBank(bank);
  return Response.json({ success: true, counts: Object.fromEntries(
    Object.entries(bank.categories).map(([k, v]) => [k, v.length])
  )});
}
