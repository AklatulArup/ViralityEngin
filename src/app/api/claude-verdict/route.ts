import { NextRequest, NextResponse } from "next/server";

const PERSONA_SYSTEMS: Record<string, string> = {
  algorithm:    "You are an Algorithm Analyst. Write EXACTLY 3 sentences. State what the algorithm is doing right now, the key limiting or driving signal, and what would change the outcome. Use numbers. No fluff.",
  strategist:   "You are a Content Strategist. Write EXACTLY 3 sentences. State whether the hook and title are working citing the engagement number, the structural reason it is succeeding or failing, and the single highest-leverage change.",
  psychologist: "You are an Audience Psychologist. Write EXACTLY 3 sentences. State the emotional need being met citing comment density, what this audience does after watching, and the retention risk.",
  competitor:   "You are a Competitive Intelligence Analyst. Write EXACTLY 3 sentences. State where this video outperforms the pool, where it loses ground, and what is being left on the table.",
  verdict:      "You are a Chief Intelligence Officer. Write exactly 3 short paragraphs separated by a blank line. No headers. No bullets. No markdown. Paragraph 1: what the algorithm is doing right now and why. Paragraph 2: what will happen in the forecast window and the kill condition. Paragraph 3: one action to take within 48 hours and one mistake to avoid.",
  default:      "You are a content intelligence analyst. Write 2 concise paragraphs. Be specific with numbers. No bullet points.",
};

function trimPrompt(p: string, max = 2500) {
  return p.length <= max ? p : p.slice(0, max) + "\n\n[context trimmed]";
}

export async function POST(req: NextRequest) {
  let body: { prompt?: string; persona?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body.prompt) return NextResponse.json({ error: "prompt required" }, { status: 400 });

  // Try every possible key name you might have set in Vercel
  const apiKey =
    process.env.Claude_AI_Summary_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.CLAUDE_API_KEY ||
    process.env.claude_api_key;

  if (!apiKey) {
    return NextResponse.json({
      error: "No API key found. Add Claude_AI_Summary_API_KEY to Vercel environment variables.",
    }, { status: 503 });
  }

  const systemPrompt = PERSONA_SYSTEMS[body.persona ?? "default"] ?? PERSONA_SYSTEMS.default;

  // Try current model names in order
  for (const model of [
    "claude-haiku-4-5-20251001",
    "claude-3-5-haiku-20241022",
    "claude-3-haiku-20240307",
  ]) {
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 400,
          system: systemPrompt,
          messages: [{ role: "user", content: trimPrompt(body.prompt) }],
        }),
      });
      const d = await r.json();
      if (!r.ok) { console.error(`${model}:`, d.error?.message, d.error?.type); continue; }
      const text = d.content?.find((b: {type:string}) => b.type === "text")?.text ?? "";
      if (text.length > 10) return NextResponse.json({ text, source: model });
    } catch (e) { console.error(`${model} exception:`, e); }
  }

  return NextResponse.json({ error: "Anthropic API call failed. Check Vercel function logs for details." }, { status: 503 });
}
