import { importEvidence } from "@/lib/import-evidence";
import { apiError, DataError } from "@/lib/storage-backend";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (
      !origin ||
      new URL(origin).host !==
        (request.headers.get("host") || new URL(request.url).host)
    )
      throw new DataError("Invalid request origin.", 403);
    const size = Number(request.headers.get("content-length") || 0);
    if (size > 11 * 1024 * 1024)
      throw new DataError("The import exceeds 10 MB.", 413);
    const form = await request.formData(),
      file = form.get("file");
    if (file instanceof File && file.size > 10 * 1024 * 1024)
      throw new DataError("The PDF exceeds 10 MB.", 413);
    const draft = await importEvidence(
      {
        text: String(form.get("text") || ""),
        url: String(form.get("url") || ""),
        ...(file instanceof File
          ? {
              file: {
                name: file.name,
                bytes: new Uint8Array(await file.arrayBuffer()),
              },
            }
          : {}),
      },
      request.signal,
    );
    return Response.json(
      { draft },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
