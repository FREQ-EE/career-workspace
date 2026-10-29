import { apiError, sameOrigin, DataError } from "@/lib/storage-backend";
import { confirmEvidence } from "@/lib/import-evidence";
import {
  interview,
  applyInterview,
  finishOnboarding,
  prepareDraft,
  confirmStep,
  prepareCVVariant,
} from "@/lib/interview";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const raw = await request.text();
    if (raw.length > 150000) throw new DataError("Request is too large.", 413);
    const args = JSON.parse(raw);
    let result: unknown;
    switch (args.action) {
      case "confirm-step":
        result = await confirmStep(String(args.step || ""));
        break;
      case "prepare-cv":
        result = await prepareCVVariant(
          String(args.opportunityId || ""),
          request.signal,
        );
        break;
      case "confirm-evidence":
        result = await confirmEvidence();
        break;
      case "interview":
        result = await interview(
          String(args.step || ""),
          String(args.answer || ""),
          request.signal,
        );
        break;
      case "apply-interview":
        result = await applyInterview(args.suggestions);
        break;
      case "finish-onboarding":
        result = await finishOnboarding();
        break;
      case "prepare-draft":
        result = await prepareDraft(
          String(args.opportunityId || ""),
          String(args.kind || ""),
          request.signal,
        );
        break;
      default:
        throw new DataError("Unknown action.", 400);
    }
    return Response.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
