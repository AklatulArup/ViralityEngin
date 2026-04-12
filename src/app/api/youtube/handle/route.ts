import { NextRequest } from "next/server";
import { fetchByHandle } from "@/lib/youtube";

export async function GET(request: NextRequest) {
  const handle = request.nextUrl.searchParams.get("handle");
  if (!handle) {
    return Response.json({ error: "Missing handle" }, { status: 400 });
  }

  try {
    const channel = await fetchByHandle(handle);
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
