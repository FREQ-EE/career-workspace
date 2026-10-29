import {
  verifyCloud,
  publishSearchBrief,
  importCloudResults,
  cloudStatus,
  disconnectCloud,
  cloudInstructions,
} from "@/lib/cloud-inbox";
import { sameOrigin, apiError, DataError } from "@/lib/storage-backend";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return Response.json(
      { ...(await cloudStatus()), instructions: await cloudInstructions() },
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
    const { action, token } = await request.json();
    let result: unknown;
    switch (action) {
      case "verify":
        result = await verifyCloud(String(token || ""));
        break;
      case "publish":
        result = await publishSearchBrief();
        break;
      case "import":
        result = await importCloudResults();
        break;
      case "disconnect":
        result = await disconnectCloud();
        break;
      default:
        throw new DataError("Unknown cloud action.", 400);
    }
    return Response.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
