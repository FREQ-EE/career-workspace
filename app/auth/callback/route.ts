import { finishSignIn } from "@/lib/chatgpt-auth";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  let message = "";
  try {
    await finishSignIn(new URL(request.url));
    message =
      "ChatGPT is connected. Return to Career Workshop and check the connection.";
  } catch (error) {
    message =
      error instanceof Error
        ? error.message
        : "Sign-in could not be completed.";
  }
  return new Response(
    '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Career Workshop connection</title><body style="font:17px system-ui;max-width:520px;margin:15vh auto;padding:24px;line-height:1.6"><h1>Career Workshop</h1><p>' +
      message.replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c]!,
      ) +
      '</p><a href="/">Return to the workspace</a></body></html>',
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
      },
    },
  );
}
