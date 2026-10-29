import { readJSON, apiError } from "@/lib/storage-backend";
import { recordPaths } from "@/lib/career";
import { activeSearch } from "@/lib/search";
import { config } from "@/lib/runtime";
import pkg from "@/package.json";
import { validateRecord } from "@/lib/validation";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const entries = await Promise.all(
      Object.entries(recordPaths).map(async ([key, path]) => {
        const record = await readJSON(path);
        validateRecord(path, record.data);
        if (key === "journey" && record.data.draft)
          validateRecord("career/cv.json", record.data.draft.cv);
        return [key, { data: record.data, revision: record.sha }];
      }),
    );
    return Response.json(
      {
        records: Object.fromEntries(entries),
        active: activeSearch(),
        desktop: !!config("CW_SECRET_BRIDGE"),
        version: pkg.version,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
