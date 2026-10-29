import {
  readJSON,
  readBytes,
  writeJSON,
  writeBytes,
  apiError,
  sameOrigin,
  DataError,
} from "@/lib/storage-backend";
import { saveEdits } from "@/lib/save-edits";
import { validateRecord } from "@/lib/validation";
import { renderCV } from "@/lib/cv-pdf";
import type { CV } from "@/lib/career";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: Request) {
  try {
    if (new URL(request.url).searchParams.get("asset") === "portrait") {
      const asset = await readBytes("assets/cv/portrait.jpg");
      return new Response(asset.bytes as BodyInit, {
        headers: { ...headers, "Content-Type": "image/jpeg" },
      });
    }
    const { data, sha } = await readJSON("career/cv.json");
    return Response.json({ cv: data, revision: sha }, { headers });
  } catch (e) {
    return apiError(e);
  }
}
export async function PUT(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const raw = await request.text();
    if (raw.length > 500000) throw new DataError("CV is too large.", 413);
    const { cv, revision, edits } = JSON.parse(raw);
    if (edits)
      return Response.json(
        await saveEdits(
          "career/cv.json",
          edits,
          (value) => {
            validateRecord("career/cv.json", value);
            return true;
          },
          "Career Workshop: autosave CV",
        ),
        { headers },
      );
    validateRecord("career/cv.json", cv);
    if (typeof revision !== "string" || !/^[a-f0-9]{40}$/.test(revision))
      throw new DataError("Invalid revision.", 400);
    const saved = await writeJSON(
      "career/cv.json",
      cv,
      revision,
      "Career Workshop: update CV",
    );
    return Response.json({ data: cv, revision: saved.sha }, { headers });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const raw = await request.text();
    if (raw.length > 10000) throw new DataError("Request is too large.", 413);
    const {
      variantId = "",
      photo = false,
      opportunityId = "",
    } = JSON.parse(raw);
    if (
      typeof variantId !== "string" ||
      typeof photo !== "boolean" ||
      typeof opportunityId !== "string"
    )
      throw new DataError("Invalid document options.", 400);
    const { data: cv, sha } = await readJSON<CV>("career/cv.json");
    validateRecord("career/cv.json", cv);
    if (variantId && !cv.variants.some((v) => v.id === variantId))
      throw new DataError("This CV variant no longer exists.", 400);
    const summary =
      cv.variants.find((v) => v.id === variantId)?.summary || cv.summary;
    if (!cv.name.trim() || !summary.trim())
      throw new DataError(
        "Complete and review the name and profile before exporting.",
        400,
      );
    const [regular, medium, portrait] = await Promise.all([
      readBytes("assets/cv/Raleway-Regular.ttf"),
      readBytes("assets/cv/Raleway-Medium.ttf"),
      photo ? readBytes("assets/cv/portrait.jpg").catch(() => null) : null,
    ]);
    const pdf = await renderCV(cv, variantId, photo, {
      regular: regular.bytes,
      medium: medium.bytes,
      portrait: portrait?.bytes,
    });
    const base =
      "applications/generated/" +
      new Date().toISOString().replace(/[:.]/g, "-") +
      "-" +
      crypto.randomUUID().slice(0, 8);
    await writeJSON(
      base + "/snapshot.json",
      {
        schemaVersion: 1,
        createdAt: new Date().toISOString(),
        variantId,
        photo,
        opportunityId,
        cvSourceSha: sha,
        cv,
        reviewStatus: "Review required before sending",
      },
      undefined,
      "Career Workshop: save document source",
    );
    await writeBytes(
      base + "/cv.pdf",
      pdf,
      undefined,
      "Career Workshop: save CV PDF",
    );
    return new Response(pdf as BodyInit, {
      headers: {
        ...headers,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${cv.name.replace(/[^a-zA-Z0-9-]+/g, "-")}-CV.pdf"`,
        "X-Career-Document": base + "/cv.pdf",
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
