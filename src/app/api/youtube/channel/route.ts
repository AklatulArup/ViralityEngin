import { NextRequest } from "next/server";
import { fetchChannel } from "@/lib/youtube";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return Response.json({ error: "Missing channel id" }, { status: 400 });
  }

  try {
    const channel = await fetchChannel(id);
    if (!channel) {
      return Response.json({ error: "Channel not found" }, { status: 404 });
    }
    return Response.json(channel);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
