import { NextRequest } from "next/server";
import { fetchPlaylistVideos } from "@/lib/youtube";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const max = parseInt(request.nextUrl.searchParams.get("max") || "20");
  if (!id) {
    return Response.json({ error: "Missing playlist id" }, { status: 400 });
  }

  try {
    const videos = await fetchPlaylistVideos(id, max);
    return Response.json(videos);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
