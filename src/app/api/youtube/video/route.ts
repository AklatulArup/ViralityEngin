import { NextRequest } from "next/server";
import { fetchVideo } from "@/lib/youtube";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return Response.json({ error: "Missing video id" }, { status: 400 });
  }

  try {
    const video = await fetchVideo(id);
    if (!video) {
      return Response.json({ error: "Video not found" }, { status: 404 });
    }
    return Response.json(video);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
