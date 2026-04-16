import { NextRequest, NextResponse } from "next/server";

const PERSONA_SYSTEMS: Record<string, string> = {
  algorithm:    "You are an Algorithm Analyst. Write EXACTLY 3 sentences. Sentence 1: what the algorithm is doing to this video right now and why. Sentence 2: the specific signal that is limiting or driving distribution. Sentence 3: the one thing that would change the algorithm's decision. Numbers only. No fluff.",
  strategist:   "You are a Content Strategist. Write EXACTLY 3 sentences. Sentence 1: whether the hook and title are working — cite the engagement number as proof. Sentence 2: the structural reason the content is succeeding or failing. Sentence 3: the single highest-leverage change. Disagree with algorithm-first thinking where warranted.",
  psychologist: "You are an Audience Psychologist. Write EXACTLY 3 sentences. Sentence 1: the emotional need this content is meeting — cite comment density as proof. Sentence 2: what this audience type does after watching. Sentence 3: the retention risk based on emotional pattern.",
  competitor:   "You are a Competitive Intelligence Analyst. Write EXACTLY 3 sentences. Sentence 1: where this video is outperforming comparable creators — cite pool data. Sentence 2: where it is losing ground and why. Sentence 3: the one thing being left on the table.",
  verdict: `You are a Chief Intelligence Officer. Write EXACTLY 3 short paragraphs separated by blank lines. No headers, no bullets, no markdown.

Paragraph 1: What the algorithm is doing right now and why — name the mechanism.
Paragraph 2: What will happen in the forecast window — one sentence on the kill condition, one on the opportunity.
Paragraph 3: One directive to act on within 48 hours. One mistake to avoid right now.`,
  default: "You are a sharp content intelligence analyst. Write 2-3 concise paragraphs. Be specific with numbers. No bullet points. No markdown.",
};

// OpenRouter — try paid Claude model, fall back to free model
async function callOpenRouter(prompt: string, systemPrompt: string, apiKey: string): Promise<string> {
  // Try Claude Sonnet first, fall back to free Llama if model not available
  const models = [
    "anthropic/claude-3.5-sonnet",
    "anthropic/claude-3-haiku",
    "meta-llama/llama-3.1-8b-instruct:free",
    "google/gemma-2-9b-it:free",
  ];

  let lastError = "";
  for (const model of models) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://virality-engin.vercel.app",
          "X-Title": "FundedNext Platform Intelligence",
        },
        body: JSON.stringify({
          model,
          max_tokens: 600,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user",   content: prompt },
          ],
        }),
      });

      const data = await response.json();

      // If model not found or not authorized, try next
      if (!response.ok) {
        lastError = `${model}: ${data.error?.message ?? response.status}`;
        if (response.status === 404 || response.status === 400) continue;
        throw new Error(lastError);
      }

      const text = data.choices?.[0]?.message?.content ?? "";
      if (text && text.length > 10) return text;
      lastError = `${model}: empty response`;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      // Only continue to next model on "model not found" type errors
      if (!lastError.includes("404") && !lastError.includes("not found") && !lastError.includes("400")) {
        throw new Error(lastError);
      }
    }
  }
  throw new Error(`All OpenRouter models failed. Last error: ${lastError}`);
}

async function callAnthropic(prompt: string, systemPrompt: string, apiKey: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message ?? `Anthropic ${response.status}`);
  const text = data.content?.find((b: { type: string }) => b.type === "text")?.text ?? "";
  if (!text) throw new Error("Empty response from Anthropic");
  return text;
}

export async function POST(req: NextRequest) {
  let body: { prompt?: string; persona?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!body.prompt) return NextResponse.json({ error: "prompt required" }, { status: 400 });

  const prompt       = body.prompt;
  const persona      = body.persona ?? "default";
  const systemPrompt = PERSONA_SYSTEMS[persona] ?? PERSONA_SYSTEMS.default;

  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const anthropicKey  = process.env.ANTHROPIC_API_KEY || process.env.Claude_AI_Summary_API_KEY;

  const errors: string[] = [];

  // ── Try 1: OpenRouter ──
  if (openRouterKey) {
    try {
      const text = await callOpenRouter(prompt, systemPrompt, openRouterKey);
      return NextResponse.json({ text, source: "openrouter" });
    } catch (e) {
      errors.push(`OpenRouter: ${e instanceof Error ? e.message : String(e)}`);
    }
  } else {
    errors.push("OpenRouter: OPENROUTER_API_KEY not set in Vercel environment");
  }

  // ── Try 2: Anthropic direct ──
  if (anthropicKey) {
    try {
      const text = await callAnthropic(prompt, systemPrompt, anthropicKey);
      return NextResponse.json({ text, source: "anthropic" });
    } catch (e) {
      errors.push(`Anthropic: ${e instanceof Error ? e.message : String(e)}`);
    }
  } else {
    errors.push("Anthropic: no key set");
  }

  return NextResponse.json(
    { error: "All AI providers failed", details: errors },
    { status: 503 }
  );
}
