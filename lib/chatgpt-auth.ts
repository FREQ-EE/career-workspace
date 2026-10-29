import { randomBytes, randomUUID, createHash } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { readSecret, writeSecret, vault } from "./vault";
import { DataError } from "./storage-backend";
type Session = {
  clientId: string;
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresAt: number;
  scope: string;
  name: string;
  email: string;
  subject: string;
};
type Attempt = {
  state: string;
  nonce: string;
  verifier: string;
  redirect: string;
  clientId: string;
  expiresAt: number;
  subject?: string;
};
const stateKey = Symbol.for("career-workshop.oauth");
const state: { attempts: Map<string, Attempt>; refresh?: Promise<Session> } = ((
  globalThis as any
)[stateKey] ??= { attempts: new Map() });
const auth = "https://auth.openai.com",
  resource = "https://api.openai.com/v1";
const b64 = () => randomBytes(32).toString("base64url");
async function oidc() {
  const r = await fetch(auth + "/.well-known/openid-configuration", {
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error("OpenAI sign-in discovery is unavailable.");
  return r.json();
}
export async function beginSignIn(origin: string) {
  const parsed = new URL(origin);
  if (parsed.hostname !== "127.0.0.1" || parsed.protocol !== "http:")
    throw new DataError(
      "Subscription sign-in needs the local desktop application.",
      400,
    );
  let host = await readSecret<{ id: string }>("chatgpt-host");
  if (!host) {
    host = { id: "urn:uuid:" + randomUUID() };
    await writeSecret("chatgpt-host", host);
  }
  const prior = await readSecret<Session>("chatgpt-session");
  const attempt: Attempt = {
    state: b64(),
    nonce: b64(),
    verifier: b64(),
    redirect: origin + "/auth/callback",
    clientId: prior?.clientId || "dynamic_agent_client",
    expiresAt: Date.now() + 10 * 60_000,
    subject: prior?.subject,
  };
  for (const [id, a] of state.attempts)
    if (a.expiresAt < Date.now()) state.attempts.delete(id);
  state.attempts.set(attempt.state, attempt);
  const url = new URL(auth + "/api/accounts/authorize");
  const params: Record<string, string> = {
    client_id: attempt.clientId,
    ext_agent_host_id: host.id,
    response_type: "code",
    redirect_uri: attempt.redirect,
    scope:
      "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct",
    resource,
    state: attempt.state,
    nonce: attempt.nonce,
    code_challenge_method: "S256",
    code_challenge: createHash("sha256")
      .update(attempt.verifier)
      .digest("base64url"),
  };
  if (attempt.clientId === "dynamic_agent_client")
    params.agent_name_hint = "Career Workshop";
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url.href;
}
export async function finishSignIn(url: URL) {
  const key = url.searchParams.get("state") || "",
    attempt = state.attempts.get(key);
  state.attempts.delete(key);
  if (!attempt || attempt.expiresAt < Date.now())
    throw new DataError(
      "The sign-in attempt expired or could not be verified. Start again.",
      400,
    );
  if (url.searchParams.has("error"))
    throw new DataError(
      "Sign-in was cancelled or permission was declined.",
      400,
    );
  const code = url.searchParams.get("code"),
    issued = url.searchParams.get("client_id");
  const clientId =
    attempt.clientId === "dynamic_agent_client" ? issued : attempt.clientId;
  if (
    !code ||
    !clientId ||
    clientId === "dynamic_agent_client" ||
    (attempt.clientId !== "dynamic_agent_client" &&
      issued &&
      issued !== clientId)
  )
    throw new DataError("OpenAI returned an incomplete registration.", 400);
  const response = await fetch(auth + "/api/accounts/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      code,
      code_verifier: attempt.verifier,
      redirect_uri: attempt.redirect,
      resource,
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw new DataError(
      "OpenAI could not complete sign-in. Please start a fresh attempt.",
    );
  const tokens = await response.json(),
    discovery = await oidc();
  if (
    typeof discovery.jwks_uri !== "string" ||
    new URL(discovery.jwks_uri).origin !== auth
  )
    throw new DataError("OpenAI returned an unexpected sign-in configuration.");
  const { payload } = await jwtVerify(
    tokens.id_token,
    createRemoteJWKSet(new URL(discovery.jwks_uri)),
    { issuer: discovery.issuer, audience: clientId },
  );
  if (
    payload.nonce !== attempt.nonce ||
    typeof payload.sub !== "string" ||
    (attempt.subject && payload.sub !== attempt.subject)
  )
    throw new DataError("The OpenAI identity could not be verified.", 400);
  const scope = String(tokens.scope || "");
  if (!scope.split(" ").includes("chatgpt.tokens.use.direct"))
    throw new DataError(
      "Permission to use the ChatGPT plan was not enabled. Reconnect and review the requested permissions.",
      400,
    );
  const session: Session = {
    clientId,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    idToken: tokens.id_token,
    expiresAt: Date.now() + Number(tokens.expires_in || 3600) * 1000,
    scope,
    name: String(payload.name || ""),
    email: String(payload.email || ""),
    subject: payload.sub,
  };
  await writeSecret("chatgpt-session", session);
  const verification = (await readSecret<any>("provider-verification")) || {};
  delete verification.chatgpt;
  await writeSecret("provider-verification", verification);
  return { name: session.name, email: session.email };
}
export async function chatgptSession() {
  const session = await readSecret<Session>("chatgpt-session");
  if (!session)
    throw new DataError("Connect ChatGPT in Settings → AI & connections.", 401);
  if (session.expiresAt > Date.now() + 60_000) return session;
  if (!state.refresh)
    state.refresh = (async () => {
      const response = await fetch(auth + "/api/accounts/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: session.clientId,
          refresh_token: session.refreshToken,
          resource,
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok)
        throw new DataError(
          "ChatGPT sign-in needs renewal. Reconnect in Settings.",
          401,
        );
      const t = await response.json();
      const renewed = {
        ...session,
        accessToken: t.access_token,
        refreshToken: t.refresh_token || session.refreshToken,
        idToken: t.id_token || session.idToken,
        expiresAt: Date.now() + Number(t.expires_in || 3600) * 1000,
      };
      await writeSecret("chatgpt-session", renewed);
      return renewed;
    })().finally(() => {
      state.refresh = undefined;
    });
  return state.refresh;
}
export async function chatgptModels() {
  const session = await chatgptSession();
  const r = await fetch(resource + "/models", {
    headers: { Authorization: "Bearer " + session.accessToken },
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok)
    throw new DataError(
      "ChatGPT could not verify this connection or its model access.",
      r.status === 401 ? 401 : 503,
    );
  const data = await r.json();
  return (data.models || data.data || [])
    .filter((m: any) => m.visibility === undefined || m.visibility === "list")
    .map((m: any) => ({
      id: String(m.slug || m.id),
      name: String(m.display_name || m.id || m.slug),
    }));
}
export async function disconnectChatgpt() {
  const session = await readSecret<Session>("chatgpt-session");
  let revoked = true;
  if (session?.refreshToken) {
    try {
      const discovery = await oidc();
      const endpoint = new URL(discovery.revocation_endpoint);
      if (endpoint.origin !== auth)
        throw new Error("Unexpected revocation endpoint.");
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          token: session.refreshToken,
          token_type_hint: "refresh_token",
          client_id: session.clientId,
        }),
        signal: AbortSignal.timeout(10000),
      });
      revoked = response.ok;
    } catch {
      revoked = false;
    }
  }
  await vault("delete", "chatgpt-session");
  const verification = (await readSecret<any>("provider-verification")) || {};
  delete verification.chatgpt;
  await writeSecret("provider-verification", verification);
  return { revoked };
}
