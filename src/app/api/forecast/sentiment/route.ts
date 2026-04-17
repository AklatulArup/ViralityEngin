// /api/forecast/sentiment
//
// Analyses the top comments on a video using Gemini to produce a sentiment
// score. Positive sentiment correlates with reach expansion on every platform —
// the algorithm promotes content that generates positive engagement.
//
// Input: array of comment strings (caller supplies — typically 10-20)
// Output: overall score 0-100, positive/neutral/negative counts, flags

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export interface SentimentResult {
  score:        number;    // 0-100 (100 = overwhelmingly positive)
  positive:     number;    // count classed positive
  neutral:      number;
  negative:     number;
  mixed:        number;
  flags:        string[];  // warning signals (e.g. "controversy", "off-topic")
  reachSignal:  "strong-positive" | "positive" | "neutral" | "mixed" | "negative";
  rationale:    string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const comments: string[] = Array.isArray(body?.comments)
      ? body.comments.filter((c: unknown) => typeof c === "string" && c.length > 0).slice(0, 30)
      : [];

    if (comments.length === 0) {
      return NextResponse.json({ ok: false, reason: "no_comments" });
    }

    const geminiKey = process.env.GEMINI_API_KEY ?? process.env.GEMINI_API_KEY_2;
    if (!geminiKey) {
      return NextResponse.json({ ok: false, reason: "gemini_not_configured" });
    }

    const prompt = buildSentimentPrompt(comments);

    const gemRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 512, responseMimeType: "application/json" },
        }),
      },
    );

    if (!gemRes.ok) {
      const errText = await gemRes.text().catch(() => "unknown");
      return NextResponse.json({ ok: false, reason: "gemini_error", detail: errText.slice(0, 200) });
    }

    const gemData = await gemRes.json();
    const raw = gemData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const parsed = safeJsonParse(raw);
    if (!parsed) {
      return NextResponse.json({ ok: false, reason: "gemini_parse_failed" });
    }

    const result: SentimentResult = normaliseResult(parsed, comments.length);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    console.error("[api/forecast/sentiment]", e);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

// ─── PROMPT BUILDER ───────────────────────────────────────────────────────

function buildSentimentPrompt(comments: string[]): string {
  const commentBlock = comments
    .map((c, i) => `${i + 1}. ${c.slice(0, 250).replace(/\n/g, " ")}`)
    .join("\n");

  return `You are analysing sentiment on social media comments for a content virality forecast.
Context: a creator posted a video. These are the top comments on it. Assess the sentiment.

Comments:
${commentBlock}

Classify each comment into one of: positive, neutral, negative, mixed.
Also flag any of these signals present across the comments: "controversy", "off-topic", "bot-activity", "hate-speech", "low-effort", "highly-engaged-debate".

Return ONLY valid JSON in this exact shape:
{
  "positive": <int>,
  "neutral": <int>,
  "negative": <int>,
  "mixed": <int>,
  "flags": [<0 or more flag strings from the list above>],
  "summary": "<one-sentence overall assessment>"
}`;
}

// ─── RESULT NORMALISATION ─────────────────────────────────────────────────

function normaliseResult(parsed: Record<string, unknown>, total: number): SentimentResult {
  const pos = intOrZero(parsed.positive);
  const neu = intOrZero(parsed.neutral);
  const neg = intOrZero(parsed.negative);
  const mix = intOrZero(parsed.mixed);
  const flags: string[] = Array.isArray(parsed.flags)
    ? (parsed.flags as unknown[]).filter((f): f is string => typeof f === "string").slice(0, 5)
    : [];
  const summary = typeof parsed.summary === "string" ? parsed.summary : "";

  const sumClassified = pos + neu + neg + mix;
  const denom = sumClassified > 0 ? sumClassified : total;

  // Score: positive = +100, mixed = +50, neutral = +50, negative = 0
  // Then scale to 0-100
  const rawScore = (pos * 100 + mix * 50 + neu * 50 + neg * 0) / Math.max(1, denom);

  // Penalty for hate-speech or bot-activity flags
  let adjScore = rawScore;
  if (flags.includes("hate-speech")) adjScore -= 30;
  if (flags.includes("bot-activity")) adjScore -= 15;
  adjScore = Math.max(0, Math.min(100, adjScore));

  const reachSignal: SentimentResult["reachSignal"] =
    adjScore >= 80 ? "strong-positive" :
    adjScore >= 60 ? "positive" :
    adjScore >= 40 ? "neutral" :
    adjScore >= 25 ? "mixed" :
                     "negative";

  return {
    score: Math.round(adjScore),
    positive: pos, neutral: neu, negative: neg, mixed: mix,
    flags, reachSignal,
    rationale: summary || defaultRationale(reachSignal, pos, neg, denom),
  };
}

function defaultRationale(signal: SentimentResult["reachSignal"], pos: number, neg: number, total: number): string {
  if (signal === "strong-positive") return `Overwhelmingly positive sentiment (${pos}/${total}). Algorithm likely to amplify distribution.`;
  if (signal === "positive")        return `Broadly positive sentiment (${pos}/${total} positive). Healthy distribution signal.`;
  if (signal === "mixed")            return `Mixed sentiment (${pos} positive, ${neg} negative). Distribution likely capped.`;
  if (signal === "negative")         return `Negative sentiment dominant (${neg}/${total}). Algorithm may slow distribution.`;
  return "Neutral — no strong sentiment signal.";
}

function intOrZero(v: unknown): number {
  if (typeof v === "number" && isFinite(v)) return Math.max(0, Math.round(v));
  if (typeof v === "string") { const n = parseInt(v, 10); return isNaN(n) ? 0 : Math.max(0, n); }
  return 0;
}

function safeJsonParse(text: string): Record<string, unknown> | null {
  try { return JSON.parse(text); } catch { /* try stripped */ }
  // Gemini sometimes wraps in ```json...``` despite responseMimeType — strip
  const stripped = text.replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();
  try { return JSON.parse(stripped); } catch { return null; }
}
