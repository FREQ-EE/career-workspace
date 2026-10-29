import { backupBytes, restoreBackup, saveAutomaticBackup } from "@/lib/backups";
import { apiError, DataError } from "@/lib/storage-backend";
import { activeSearch } from "@/lib/search";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const bytes = await backupBytes();
    return new Response(bytes as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="Career-Workshop-Backup-${new Date().toISOString().slice(0, 10)}.zip"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (
      !origin ||
      new URL(origin).host !==
        (request.headers.get("host") || new URL(request.url).host)
    )
      throw new DataError("Invalid request origin.", 403);
    if (activeSearch())
      throw new DataError(
        "Wait for the current search to finish before restoring.",
        409,
      );
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      if (Number(request.headers.get("content-length") || 0) > 65 * 1024 * 1024)
        throw new DataError("Backup too large.", 413);
      const form = await request.formData(),
        file = form.get("file");
      if (!(file instanceof File) || form.get("confirm") !== "RESTORE")
        throw new DataError("Confirm the restore before continuing.", 400);
      return Response.json(
        await restoreBackup(new Uint8Array(await file.arrayBuffer())),
      );
    }
    return Response.json(await saveAutomaticBackup());
  } catch (error) {
    return apiError(error);
  }
}
