import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });

  const body = await req.json();

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: `You are a sharp, data-driven content intelligence analyst. You write concise, plain-English verdicts about video content performance. Be specific with numbers. No fluff. No bullet soup. Write in flowing paragraphs. Focus on: why it's performing this way, what signals confirm it, what the comment section suggests about the audience. Max 3 paragraphs.`,
      messages: [{ role: "user", content: body.prompt }],
    }),
  });

  const data = await response.json();
  if (!response.ok) return NextResponse.json({ error: data.error?.message || "API error" }, { status: 500 });
  return NextResponse.json({ text: data.content?.[0]?.text ?? "" });
}
