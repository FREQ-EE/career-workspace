import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { DataError } from "./storage-backend.ts";
export function publicAddress(value: string) {
  const ip = value.toLowerCase().replace(/^\[|\]$/g, "");
  if (ip.includes(":")) {
    if (ip.startsWith("::ffff:")) return publicAddress(ip.slice(7));
    return (
      isIP(ip) === 6 && !/^(::|fc|fd|fe8|fe9|fea|feb|ff|2001:db8)/.test(ip)
    );
  }
  if (isIP(ip) !== 4) return false;
  const [a, b] = ip.split(".").map(Number);
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19))
  );
}
export async function checkedPublicURL(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new DataError("Enter a valid public HTTPS URL.", 400);
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443")
  )
    throw new DataError("Only public HTTPS URLs are supported.", 400);
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  )
    throw new DataError("Local and private addresses cannot be fetched.", 400);
  const addresses = await lookup(host, { all: true });
  if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
    throw new DataError("Local and private addresses cannot be fetched.", 400);
  return url;
}
export async function publicText(
  value: string,
  { limit = 2_000_000, signal }: { limit?: number; signal?: AbortSignal } = {},
) {
  let url = await checkedPublicURL(value);
  for (let redirect = 0; redirect < 5; redirect++) {
    const response = await fetch(url, {
      redirect: "manual",
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
        : AbortSignal.timeout(15000),
      headers: {
        Accept: "text/html,text/plain,application/json",
        "User-Agent": "CareerWorkshop/2 (personal career research)",
      },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location)
        throw new Error("The site returned an incomplete redirect.");
      url = await checkedPublicURL(new URL(location, url).href);
      continue;
    }
    const type = response.headers.get("content-type") || "";
    if (!/(text\/|application\/(json|ld\+json|xhtml\+xml))/.test(type)) {
      await response.body?.cancel();
      throw new Error("This address does not return readable page content.");
    }
    const reader = response.body?.getReader();
    let size = 0;
    const chunks: Uint8Array[] = [];
    if (reader) {
      try {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          size += part.value.length;
          if (size > limit)
            throw new Error("The page exceeds the import limit.");
          chunks.push(part.value);
        }
      } finally {
        await reader.cancel().catch(() => {});
      }
    }
    const buffer = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }
    return {
      status: response.status,
      url: url.href,
      text: new TextDecoder().decode(buffer),
      type,
    };
  }
  throw new Error("This page redirected too many times.");
}
export function readableText(html: string) {
  return html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
