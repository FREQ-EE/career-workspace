import { sameOrigin, DataError, apiError } from "@/lib/storage-backend";
import pkg from "@/package.json";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const { title, body, diagnostics } = await request.json();
    if (
      typeof title !== "string" ||
      !title.trim() ||
      title.length > 200 ||
      typeof body !== "string" ||
      body.length > 10000
    )
      throw new DataError("Add a short title and description.", 400);
    const report =
      body +
      (diagnostics
        ? `\n\nApplication: Career Workshop ${pkg.version}\nSystem: ${process.platform} ${process.arch}\nConnection, credentials and career records are excluded.`
        : "");
    const url = new URL(
      "https://github.com/FREQ-EE/career-workspace/issues/new",
    );
    url.searchParams.set("title", title);
    url.searchParams.set("body", report.slice(0, 6500));
    return Response.json({
      url: url.href,
      report,
      posted: false,
      message:
        "Review and submit the prepared report on GitHub. It will be public.",
    });
  } catch (error) {
    return apiError(error);
  }
}
