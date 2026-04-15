import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not set in environment" }, { status: 500 });
  }

  let body: { prompt?: string; persona?: string; mode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const systemPrompts: Record<string, string> = {
    default: "You are a sharp, data-driven content intelligence analyst. Write concise plain-English verdicts. Be specific with numbers. Write in flowing paragraphs. Max 3 paragraphs.",
    algorithm: "You are an Algorithm Analyst who ONLY cares about platform distribution signals: VRS score, velocity, retention proxies, algorithmic amplification. You are skeptical of content quality claims. You argue from data. Be opinionated and specific. 2 paragraphs max.",
    strategist: "You are a Content Strategist who focuses on format, hook quality, title construction, thumbnail psychology, and content structure. You often DISAGREE with pure algorithm analysts. You believe content quality drives everything. Be direct and contrarian where warranted. 2 paragraphs max.",
    psychologist: "You are an Audience Psychologist who reads comment patterns, engagement ratios, and audience behavior signals to understand WHY people watch and share. You often contradict both algorithmic and content-first analysts. Focus on human motivation. 2 paragraphs max.",
    competitor: "You are a Competitive Intelligence Analyst who benchmarks this content against competing channels and creators in the same niche. You are brutal about where this content loses ground to competitors. Data-driven and comparative. 2 paragraphs max.",
    verdict: "You are a Chief Intelligence Officer who has heard 4 expert analysts debate a piece of content. Your job is to synthesize their conflicting views into one decisive final verdict. Acknowledge the strongest disagreement, then give a clear recommendation. 3 paragraphs max.",
  };

  const systemPrompt = systemPrompts[body.persona ?? "default"] ?? systemPrompts.default;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: "user", content: body.prompt }],
      }),
    });

    const raw = await response.text();
    let data: { content?: Array<{ type: string; text: string }>; error?: { message: string; type: string } };
    try { data = JSON.parse(raw); } catch { return NextResponse.json({ error: `Non-JSON response: ${raw.slice(0, 200)}` }, { status: 500 }); }

    if (!response.ok) {
      return NextResponse.json({ error: data.error?.message ?? `HTTP ${response.status}`, type: data.error?.type }, { status: response.status });
    }

    const text = data.content?.find(b => b.type === "text")?.text ?? "";
    if (!text) return NextResponse.json({ error: "Empty response from API", raw: JSON.stringify(data).slice(0, 300) }, { status: 500 });

    return NextResponse.json({ text });
  } catch (err) {
    return NextResponse.json({ error: `Network error: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
  }
}
