import {
  beginSignIn,
  chatgptModels,
  disconnectChatgpt,
} from "@/lib/chatgpt-auth";
import {
  claudeStatus,
  claudeLogin,
  claudeLogout,
  runAI,
  parseAIJSON,
} from "@/lib/providers";
import { persistentVault, readSecret, writeSecret } from "@/lib/vault";
import {
  readJSON,
  apiError,
  sameOrigin,
  DataError,
} from "@/lib/storage-backend";
import type { Settings } from "@/lib/career";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const [session, claude, verification] = await Promise.all([
      readSecret<any>("chatgpt-session"),
      claudeStatus(),
      readSecret<any>("provider-verification"),
    ]);
    return Response.json(
      {
        persistent: persistentVault(),
        chatgpt: {
          connected: !!session,
          account: session?.email || "",
          verified: session ? verification?.chatgpt || null : null,
        },
        claude: {
          ...claude,
          verified: claude.connected ? verification?.claude || null : null,
        },
      },
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
    const { action, provider } = await request.json();
    if (!["chatgpt", "claude"].includes(provider))
      throw new DataError("Choose ChatGPT or Claude.", 400);
    if (action === "connect")
      return Response.json(
        provider === "chatgpt"
          ? { url: await beginSignIn(request.headers.get("origin")!) }
          : await claudeLogin(),
      );
    if (action === "disconnect")
      return Response.json(
        provider === "chatgpt"
          ? await disconnectChatgpt()
          : await claudeLogout(),
      );
    if (action === "models")
      return Response.json({
        models: provider === "chatgpt" ? await chatgptModels() : [],
      });
    if (action === "verify") {
      const { data: settings } = await readJSON<Settings>("data/settings.json");
      if (settings.provider !== provider)
        throw new DataError("Select this provider before testing.", 400);
      const result = parseAIJSON(
        await runAI(
          'Connection check only. Return exactly the JSON object {"ok":true}. No personal information is included.',
          { signal: request.signal },
        ),
      );
      if (result.ok !== true)
        throw new DataError(
          "The connection did not return the expected result.",
        );
      const status = (await readSecret<any>("provider-verification")) || {};
      status[provider] = new Date().toISOString();
      await writeSecret("provider-verification", status);
      return Response.json({ verified: true, at: status[provider] });
    }
    throw new DataError("Unknown connection action.", 400);
  } catch (error) {
    return apiError(error);
  }
}
