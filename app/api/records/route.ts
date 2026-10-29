import mapping from "@/config/record-schemas.json";
import {
  readJSON,
  writeJSON,
  apiError,
  sameOrigin,
  DataError,
} from "@/lib/storage-backend";
import { validateRecord, schemaFor } from "@/lib/validation";
import { saveEdits } from "@/lib/save-edits";
export const dynamic = "force-dynamic";
const reply = (value: unknown) =>
  Response.json(value, { headers: { "Cache-Control": "private, no-store" } });
export async function GET(request: Request) {
  try {
    const path = new URL(request.url).searchParams.get("path");
    if (path) {
      if (!schemaFor(path))
        throw new DataError("This path is not editable.", 400);
      const { data, sha } = await readJSON(path);
      return reply({ data, revision: sha });
    }
    return reply({ paths: Object.keys(mapping) });
  } catch (e) {
    return apiError(e);
  }
}
export async function PUT(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const raw = await request.text();
    if (raw.length > 1000000) throw new DataError("Record too large.", 413);
    const body = JSON.parse(raw),
      path = body.path || new URL(request.url).searchParams.get("path"),
      { data, revision, edits } = body;
    if (typeof path !== "string" || !schemaFor(path))
      throw new DataError("Record is not editable.", 400);
    if (edits)
      return reply(
        await saveEdits(
          path,
          edits,
          (value) => {
            validateRecord(path, value);
            return true;
          },
          "Career Workshop: update " + path,
        ),
      );
    if (typeof revision !== "string" || !/^[a-f0-9]{40}$/.test(revision))
      throw new DataError("Invalid record revision.", 400);
    validateRecord(path, data);
    const saved = await writeJSON(
      path,
      data,
      revision,
      "Career Workshop: update " + path,
    );
    return reply({ data, revision: saved.sha });
  } catch (e) {
    return apiError(e);
  }
}
