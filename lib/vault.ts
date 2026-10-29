import { config } from "./runtime";
import { DataError } from "./storage-backend";
const key = Symbol.for("career-workshop.session-vault");
const memory: Map<string, string> = ((globalThis as any)[key] ??= new Map<
  string,
  string
>());
export async function vault(
  action: "get" | "set" | "delete",
  name: string,
  value?: string,
): Promise<string | null> {
  if (!/^[a-z][a-z0-9-]{0,80}$/.test(name))
    throw new DataError("Invalid credential name.", 400);
  const bridge = config("CW_SECRET_BRIDGE"),
    token = config("CW_DESKTOP_TOKEN");
  if (bridge && token) {
    if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(bridge))
      throw new DataError("Invalid desktop credential service.");
    const response = await fetch(bridge + "/vault", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ action, name, value }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok)
      throw new DataError(
        "The operating-system credential store is unavailable. Reconnect when it is unlocked.",
      );
    return (await response.json()).value ?? null;
  }
  // Browser development never persists credentials in plain text.
  if (action === "set") {
    memory.set(name, value || "");
    return null;
  }
  if (action === "delete") {
    memory.delete(name);
    return null;
  }
  return memory.get(name) ?? null;
}
export async function readSecret<T>(name: string): Promise<T | null> {
  const value = await vault("get", name);
  return value ? JSON.parse(value) : null;
}
export async function writeSecret(name: string, value: unknown) {
  await vault("set", name, JSON.stringify(value));
}
export function persistentVault() {
  return !!config("CW_SECRET_BRIDGE");
}
