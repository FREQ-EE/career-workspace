import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import {
  beginSignIn,
  finishSignIn,
  chatgptSession,
  disconnectChatgpt,
} from "../lib/chatgpt-auth.ts";
import { readSecret, writeSecret, vault } from "../lib/vault.ts";
test("subscription sign-in binds PKCE, state, nonce, issued identity and refresh to the local app", async () => {
  const originalFetch = globalThis.fetch;
  const { privateKey, publicKey } = await generateKeyPair("RS256"),
    jwk = {
      ...(await exportJWK(publicKey)),
      kid: "temporary-test-key",
      alg: "RS256",
      use: "sig",
    };
  let nonce = "",
    tokenCalls = 0,
    refreshes = 0,
    revoked = false;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/.well-known/openid-configuration"))
      return Response.json({
        issuer: "https://auth.openai.com",
        jwks_uri: "https://auth.openai.com/test-jwks",
        revocation_endpoint: "https://auth.openai.com/test-revoke",
      });
    if (url.endsWith("/test-jwks")) return Response.json({ keys: [jwk] });
    if (url.endsWith("/test-revoke")) {
      revoked = true;
      return new Response(null, { status: 200 });
    }
    if (url.endsWith("/oauth/token")) {
      tokenCalls++;
      const body = new URLSearchParams(String(init?.body));
      assert.equal(body.get("client_id"), "temporary-registered-client");
      assert.equal(body.get("resource"), "https://api.openai.com/v1");
      if (body.get("grant_type") === "refresh_token") {
        refreshes++;
        return Response.json({
          access_token: "renewed-test-token",
          expires_in: 3600,
        });
      }
      assert.ok(body.get("code_verifier")!.length >= 43);
      const token = await new SignJWT({ nonce })
        .setProtectedHeader({ alg: "RS256", kid: jwk.kid })
        .setIssuer("https://auth.openai.com")
        .setAudience("temporary-registered-client")
        .setSubject("temporary-subject")
        .setExpirationTime("5m")
        .sign(privateKey);
      return Response.json({
        access_token: "temporary-access",
        refresh_token: "temporary-refresh",
        id_token: token,
        expires_in: 3600,
        scope: "chatgpt.tokens.use.direct",
      });
    }
    throw new Error("Unexpected test request.");
  };
  try {
    await assert.rejects(
      () => beginSignIn("https://invalid.example"),
      /local desktop/,
    );
    const first = new URL(await beginSignIn("http://127.0.0.1:49821"));
    assert.equal(first.searchParams.get("client_id"), "dynamic_agent_client");
    assert.equal(first.searchParams.get("code_challenge_method"), "S256");
    assert.equal(
      first.searchParams.get("redirect_uri"),
      "http://127.0.0.1:49821/auth/callback",
    );
    assert.ok(first.searchParams.get("code_challenge")!.length >= 43);
    const callback = (state: string) =>
      new URL(
        "http://127.0.0.1:49821/auth/callback?" +
          new URLSearchParams({
            state,
            code: "temporary-code",
            client_id: "temporary-registered-client",
          }),
      );
    await assert.rejects(
      () => finishSignIn(callback("wrong-state")),
      /verified/,
    );
    assert.equal(tokenCalls, 0);
    nonce = "wrong-nonce";
    await assert.rejects(
      () => finishSignIn(callback(first.searchParams.get("state")!)),
      /identity/,
    );
    assert.equal(await readSecret("chatgpt-session"), null);
    const next = new URL(await beginSignIn("http://127.0.0.1:49821"));
    nonce = next.searchParams.get("nonce")!;
    await finishSignIn(callback(next.searchParams.get("state")!));
    await assert.rejects(
      () => finishSignIn(callback(next.searchParams.get("state")!)),
      /verified/,
    );
    const saved: any = await readSecret("chatgpt-session");
    assert.equal(saved.clientId, "temporary-registered-client");
    await writeSecret("chatgpt-session", { ...saved, expiresAt: 0 });
    const sessions = await Promise.all([chatgptSession(), chatgptSession()]);
    assert.equal(refreshes, 1);
    assert.equal(sessions[0].accessToken, "renewed-test-token");
    await disconnectChatgpt();
    assert.equal(revoked, true);
    assert.equal(await readSecret("chatgpt-session"), null);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of [
      "chatgpt-session",
      "chatgpt-host",
      "provider-verification",
    ])
      await vault("delete", key);
  }
});
