import { authorisedMCP, handleMCP } from "@/lib/mcp";
import { sameOrigin } from "@/lib/storage-backend";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (!authorisedMCP(request.headers.get("authorization")))
    return Response.json(
      { error: "A local connector credential is required." },
      {
        status: 401,
        headers: { "WWW-Authenticate": "Bearer", "Cache-Control": "no-store" },
      },
    );
  const origin = request.headers.get("origin");
  if (origin && !sameOrigin(request))
    return Response.json(
      { error: "Invalid connector origin." },
      { status: 403 },
    );
  try {
    const raw = await request.text();
    if (raw.length > 1_500_000)
      return Response.json({ error: "Request too large." }, { status: 413 });
    const result = await handleMCP(JSON.parse(raw));
    return result
      ? Response.json(result, {
          headers: { "Cache-Control": "private, no-store" },
        })
      : new Response(null, { status: 202 });
  } catch {
    return Response.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Invalid JSON." },
      },
      { status: 400 },
    );
  }
}
export async function GET() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}
