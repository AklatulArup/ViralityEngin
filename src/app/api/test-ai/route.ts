import { NextResponse } from "next/server";

export async function GET() {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  
  if (!openRouterKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY not set" }, { status: 500 });
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://virality-engin.vercel.app",
        "X-Title": "FundedNext Test",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.1-8b-instruct:free",
        max_tokens: 50,
        messages: [{ role: "user", content: "Reply with: AI working" }],
      }),
    });

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? "";

    return NextResponse.json({
      status: res.ok ? "✅ OpenRouter working" : "❌ OpenRouter failed",
      httpStatus: res.status,
      model: "meta-llama/llama-3.1-8b-instruct:free",
      response: text || null,
      error: data.error ?? null,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
