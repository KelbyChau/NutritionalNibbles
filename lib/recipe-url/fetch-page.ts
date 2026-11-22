// Server-only: download a recipe page for /api/recipe-import.
//
// The URL comes from the user, so before every request (including each
// redirect hop) we check that the host resolves to a public internet
// address. Otherwise someone could make our server fetch internal things
// like http://localhost:54321 or cloud metadata at 169.254.169.254.

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const TIMEOUT_MS = 10_000;
const MAX_BYTES = 4 * 1024 * 1024; // recipe pages are big, but not this big
const MAX_REDIRECTS = 5;

export class ImportError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export function parseRecipeUrl(input: unknown): URL {
  if (typeof input !== "string" || !input.trim()) throw new ImportError("Paste a recipe link first.");
  let text = input.trim();
  if (!/^[a-z][a-z0-9+.-]*:/i.test(text)) text = "https://" + text; // "allrecipes.com/..." works too
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new ImportError("That doesn’t look like a web link.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:")
    throw new ImportError("Only http and https links can be imported.");
  if (url.username || url.password) throw new ImportError("Links with a username or password aren’t supported.");
  return url;
}

export async function fetchRecipePage(start: URL): Promise<{ html: string; finalUrl: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    let url = start;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      await assertPublicHost(url);
      let res: Response;
      try {
        res = await fetch(url, {
          redirect: "manual", // follow by hand so every hop gets the host check
          signal: controller.signal,
          headers: {
            // Many recipe sites refuse requests that don't look like a browser.
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
          },
        });
      } catch {
        throw new ImportError(
          controller.signal.aborted
            ? "That site took too long to respond."
            : "Couldn’t reach that site. Check the link and try again.",
          502,
        );
      }

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) throw new ImportError("That site sent a broken redirect.", 502);
        url = parseRecipeUrl(new URL(location, url).href);
        continue;
      }
      if (res.status === 401 || res.status === 403 || res.status === 429)
        throw new ImportError("That site blocked the import. Try a different recipe site.", 502);
      if (!res.ok) throw new ImportError(`That page returned an error (${res.status}).`, 502);
      const type = res.headers.get("content-type") ?? "";
      if (type && !/html|xml/i.test(type)) throw new ImportError("That link isn’t a web page.", 415);
      return { html: await readCapped(res), finalUrl: url.href };
    }
    throw new ImportError("That link redirects too many times.", 502);
  } finally {
    clearTimeout(timer);
  }
}

async function readCapped(res: Response) {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      break; // The recipe data is nearly always near the top; parse what we have.
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

async function assertPublicHost(url: URL) {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (/^localhost$|\.localhost$|\.local$|\.internal$/i.test(host))
    throw new ImportError("That address isn’t allowed.");
  let addresses: string[];
  if (isIP(host)) addresses = [host];
  else {
    try {
      addresses = (await lookup(host, { all: true })).map((a) => a.address);
    } catch {
      throw new ImportError("Couldn’t find that website. Check the link.");
    }
  }
  if (!addresses.length || addresses.some(isPrivateAddress))
    throw new ImportError("That address isn’t allowed.");
}

export function isPrivateAddress(ip: string): boolean {
  const v4 = ip.match(/^(?:::ffff:)?(\d+)\.(\d+)\.(\d+)\.(\d+)$/i);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 || // this-network, private, loopback, multicast/reserved
      (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
      (a === 169 && b === 254) || // link-local, cloud metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith("::ffff:")) return true; // mapped form we couldn't read as IPv4: refuse
  return (
    v6 === "::" || v6 === "::1" ||
    /^f[cd]/.test(v6) || // unique local fc00::/7
    /^fe[89ab]/.test(v6) || // link-local fe80::/10
    /^ff/.test(v6) || // multicast
    v6.startsWith("64:ff9b:") || // NAT64, can reach IPv4 internals
    v6.startsWith("2001:db8:")
  );
}
