import { activeSearch, startSearch, cancelSearch } from "@/lib/search";
import {
  readJSON,
  apiError,
  sameOrigin,
  DataError,
} from "@/lib/storage-backend";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const { data } = await readJSON("data/searches.json");
    return Response.json(
      { active: activeSearch(), ...data },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const { action, kind } = await request.json();
    if (action === "cancel") return Response.json(cancelSearch());
    if (action !== "start") throw new DataError("Unknown search action.", 400);
    return Response.json(
      {
        run: await startSearch(
          kind === "calibration" ? "calibration" : "manual",
        ),
      },
      { status: 202 },
    );
  } catch (error) {
    return apiError(error);
  }
}
