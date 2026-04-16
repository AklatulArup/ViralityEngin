import { NextRequest, NextResponse } from "next/server";

const PERSONA_SYSTEMS: Record<string, string> = {
  algorithm:    "You are an Algorithm Analyst. Write EXACTLY 3 sentences about this video. State what the algorithm is doing right now, the key limiting/driving signal, and what would change the outcome. Use the numbers. No fluff.",
  strategist:   "You are a Content Strategist. Write EXACTLY 3 sentences. State whether hook and title are working (cite engagement), the structural reason it is succeeding or failing, and the single highest-leverage change.",
  psychologist: "You are an Audience Psychologist. Write EXACTLY 3 sentences. State the emotional need being met (cite comment density), what this audience does after watching, and the retention risk.",
  competitor:   "You are a Competitive Intelligence Analyst. Write EXACTLY 3 sentences. State where this video is outperforming the pool, where it is losing ground, and what is being left on the table.",
  verdict:      "You are a Chief Intelligence Officer. Write EXACTLY 3 short paragraphs (blank line between each). No headers. No bullets. No markdown. Paragraph 1: what the algorithm is doing right now and why. Paragraph 2: what will happen in the forecast window — kill condition and opportunity. Paragraph 3: one directive to act on within 48 hours and one mistake to avoid.",
  default:      "You are a content intelligence analyst. Write 2-3 concise paragraphs. Be specific with numbers. No bullet points. No markdown.",
};

// Trim prompt to avoid token limit errors — keep the most important sections
function trimPrompt(prompt: string, maxChars = 3000): string {
  if (prompt.length <= maxChars) return prompt;
  // Keep the first section (current video data) and last section (task)
  const lines = prompt.split("\n");
  const taskIdx = lines.findIndex(l => l.includes("YOUR TASK") || l.includes("WHAT TO DO"));
  if (taskIdx > 0) {
    const head = lines.slice(0, 35).join("\n");          // video data
    const tail = lines.slice(taskIdx).join("\n");         // task instruction
    return head + "\n\n[...context trimmed for length...]\n\n" + tail;
  }
  return prompt.slice(0, maxChars) + "\n\n[...trimmed...]";
}

async function callOpenRouter(prompt: string, systemPrompt: string, apiKey: string): Promise<string> {
  const trimmed = trimPrompt(prompt);

  // Use free models as primary since no credits needed
  const models = [
    "meta-llama/llama-3.1-8b-instruct:free",
    "google/gemma-2-9b-it:free",
    "mistralai/mistral-7b-instruct:free",
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
          max_tokens: 500,
          temperature: 0.7,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user",   content: trimmed },
          ],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        lastError = `${model}: ${data.error?.message ?? `HTTP ${response.status}`}`;
        continue; // try next model
      }

      const text = data.choices?.[0]?.message?.content ?? "";
      if (text && text.length > 10) return text;
      lastError = `${model}: empty response`;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(lastError || "All OpenRouter models failed");
}

async function callAnthropic(prompt: string, systemPrompt: string, apiKey: string): Promise<string> {
  const trimmed = trimPrompt(prompt);
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: "user", content: trimmed }],
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message ?? `Anthropic ${response.status}`);
  const text = data.content?.find((b: { type: string }) => b.type === "text")?.text ?? "";
  if (!text) throw new Error("Empty Anthropic response");
  return text;
}

export async function POST(req: NextRequest) {
  let body: { prompt?: string; persona?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  if (!body.prompt) return NextResponse.json({ error: "prompt required" }, { status: 400 });

  const systemPrompt = PERSONA_SYSTEMS[body.persona ?? "default"] ?? PERSONA_SYSTEMS.default;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const anthropicKey  = process.env.ANTHROPIC_API_KEY || process.env.Claude_AI_Summary_API_KEY;

  const errors: string[] = [];

  if (openRouterKey) {
    try {
      const text = await callOpenRouter(body.prompt, systemPrompt, openRouterKey);
      return NextResponse.json({ text, source: "openrouter" });
    } catch (e) {
      errors.push(`OpenRouter: ${e instanceof Error ? e.message : String(e)}`);
    }
  } else {
    errors.push("OPENROUTER_API_KEY not set");
  }

  if (anthropicKey) {
    try {
      const text = await callAnthropic(body.prompt, systemPrompt, anthropicKey);
      return NextResponse.json({ text, source: "anthropic" });
    } catch (e) {
      errors.push(`Anthropic: ${e instanceof Error ? e.message : String(e)}`);
    }
  } else {
    errors.push("No Anthropic key set");
  }

  return NextResponse.json(
    { error: "All AI providers failed", details: errors },
    { status: 503 }
  );
}
