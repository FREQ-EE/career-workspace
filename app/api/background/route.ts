import {
  backgroundStatus,
  backgroundTick,
  stopBackground,
} from "@/lib/background";
import { sameOrigin, apiError } from "@/lib/storage-backend";
import { config } from "@/lib/runtime";
import { timingSafeEqual } from "node:crypto";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json(backgroundStatus(), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const body = await request.json();
    if (body.action === "shutdown") {
      const expected = Buffer.from(config("CW_DESKTOP_TOKEN") || ""),
        actual = Buffer.from(request.headers.get("x-career-desktop") || "");
      if (
        !expected.length ||
        expected.length !== actual.length ||
        !timingSafeEqual(expected, actual)
      )
        return Response.json(
          { error: "Desktop authorisation required." },
          { status: 403 },
        );
      await stopBackground();
      return Response.json({ stopped: true });
    }
    return Response.json(await backgroundTick());
  } catch (error) {
    return apiError(error);
  }
}
