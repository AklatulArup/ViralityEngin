import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { KeywordBank } from "@/lib/types";

const BANK_PATH = join(process.cwd(), "src/data/keyword-bank.json");

function readBank(): KeywordBank {
  try {
    const raw = readFileSync(BANK_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {
      version: 1,
      lastUpdated: "",
      categories: { niche: [], competitors: [], contentType: [], language: [] },
    };
  }
}

function writeBank(bank: KeywordBank): void {
  writeFileSync(BANK_PATH, JSON.stringify(bank, null, 2), "utf-8");
}

export async function GET() {
  const bank = readBank();
  return Response.json(bank);
}

/**
 * DELETE /api/keyword-bank
 * Body: { niche?: string[], competitors?: string[], contentType?: string[], language?: string[] }
 * Removes specified keywords from each category.
 */
export async function DELETE(request: Request) {
  const body = await request.json();
  const bank = readBank();

  const removeFromCategory = (cat: keyof typeof bank.categories, items: unknown) => {
    if (!Array.isArray(items)) return;
    const removeSet = new Set(
      (items as string[]).map((s) => s.toLowerCase().trim()).filter(Boolean)
    );
    bank.categories[cat] = bank.categories[cat].filter(
      (k) => !removeSet.has(k.toLowerCase())
    );
  };

  removeFromCategory("niche", body.niche);
  removeFromCategory("competitors", body.competitors);
  removeFromCategory("contentType", body.contentType);
  removeFromCategory("language", body.language);

  bank.lastUpdated = new Date().toISOString();
  writeBank(bank);

  return Response.json({
    success: true,
    counts: {
      niche: bank.categories.niche.length,
      competitors: bank.categories.competitors.length,
      contentType: bank.categories.contentType.length,
      language: bank.categories.language.length,
    },
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const bank = readBank();

  // Merge new keywords into existing bank
  if (body.niche && Array.isArray(body.niche)) {
    for (const kw of body.niche) {
      const normalized = kw.toLowerCase().trim();
      if (normalized && !bank.categories.niche.includes(normalized)) {
        bank.categories.niche.push(normalized);
      }
    }
  }
  if (body.competitors && Array.isArray(body.competitors)) {
    for (const kw of body.competitors) {
      const normalized = kw.toLowerCase().trim();
      if (normalized && !bank.categories.competitors.includes(normalized)) {
        bank.categories.competitors.push(normalized);
      }
    }
  }
  if (body.contentType && Array.isArray(body.contentType)) {
    for (const kw of body.contentType) {
      const normalized = kw.toLowerCase().trim();
      if (normalized && !bank.categories.contentType.includes(normalized)) {
        bank.categories.contentType.push(normalized);
      }
    }
  }

  bank.lastUpdated = new Date().toISOString();
  writeBank(bank);

  return Response.json({
    success: true,
    counts: {
      niche: bank.categories.niche.length,
      competitors: bank.categories.competitors.length,
      contentType: bank.categories.contentType.length,
    },
  });
}
