import pkg from "@/package.json";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const response = await fetch(
      "https://api.github.com/repos/FREQ-EE/career-workspace/releases?per_page=10",
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "Career-Workshop",
        },
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
      },
    );
    if (response.status === 404)
      return Response.json({
        current: pkg.version,
        available: false,
        message: "No published desktop release is available yet.",
      });
    if (!response.ok)
      throw new Error("Release information is temporarily unavailable.");
    const releases = await response.json();
    const release = releases.find((r: any) => !r.draft);
    if (!release)
      return Response.json({
        current: pkg.version,
        available: false,
        message: "No published desktop release is available yet.",
      });
    return Response.json(
      {
        current: pkg.version,
        latest: release.tag_name,
        available: String(release.tag_name).replace(/^v/, "") !== pkg.version,
        url: release.html_url,
        notes: release.body || "",
        assets: (release.assets || []).map((a: any) => ({
          name: a.name,
          url: a.browser_download_url,
          size: a.size,
        })),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Update check failed.",
      },
      { status: 503 },
    );
  }
}
