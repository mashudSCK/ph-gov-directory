import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @typedef {{ slug: string; primaryUrl: string; verificationSourceUrl: string; subLinks?: Array<{ url: string }> }} PortalUrlSource
 */

/**
 * @param {string} rawUrl
 * @returns {string}
 */
function stripWwwHost(rawUrl) {
  const host = new URL(rawUrl).hostname.toLowerCase();
  return host.startsWith("www.") ? host.slice(4) : host;
}

const SHARED_PUBLIC_SUFFIXES = new Set(["gov.ph", "com.ph", "org.ph", "edu.ph", "net.ph"]);
const TIMEOUT_CODES = new Set([
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
  "ETIMEDOUT",
]);

/**
 * @param {string} origHost
 * @param {string} finalHost
 * @returns {boolean}
 */
function isSameSiteRedirect(origHost, finalHost) {
  if (origHost === finalHost) return true;
  if (SHARED_PUBLIC_SUFFIXES.has(finalHost) || SHARED_PUBLIC_SUFFIXES.has(origHost)) {
    return false;
  }
  return finalHost.endsWith(`.${origHost}`) || origHost.endsWith(`.${finalHost}`);
}

/**
 * @param {{ status?: number; error?: unknown; originalUrl: string; finalUrl?: string }} probe
 * @returns {{ level: "OK" | "WARN" | "FAIL"; reason: string }}
 */
export function classifyProbeResult(probe) {
  if (probe.error) {
    const err = probe.error instanceof Error ? probe.error : new Error(String(probe.error));
    const cause =
      err.cause && typeof err.cause === "object"
        ? /** @type {{ code?: string; name?: string; message?: string }} */ (err.cause)
        : undefined;
    const causeCode = cause?.code ?? "";
    const causeName = cause?.name ?? "";
    const causeMessage = cause?.message ?? "";

    if (
      err.name === "TimeoutError" ||
      err.name === "AbortError" ||
      causeName === "TimeoutError" ||
      causeName === "AbortError" ||
      TIMEOUT_CODES.has(causeCode)
    ) {
      return { level: "WARN", reason: `Timeout: ${causeCode || err.message}` };
    }
    if (causeCode === "UNABLE_TO_VERIFY_LEAF_SIGNATURE") {
      return {
        level: "WARN",
        reason: "TLS incomplete intermediate chain (browsers resolve via AIA)",
      };
    }
    if (causeMessage.includes("does not match the HTTP/1.1 protocol")) {
      return {
        level: "WARN",
        reason: `Non-strict HTTP response header (${causeMessage})`,
      };
    }
    return { level: "FAIL", reason: causeCode ? `${err.message} (${causeCode})` : err.message };
  }

  const status = probe.status ?? 0;
  if (status >= 200 && status < 300) {
    if (probe.finalUrl) {
      const origHost = stripWwwHost(probe.originalUrl);
      const finalHost = stripWwwHost(probe.finalUrl);
      if (!isSameSiteRedirect(origHost, finalHost)) {
        return { level: "WARN", reason: `HTTP ${status} redirected to ${finalHost}` };
      }
    }
    return { level: "OK", reason: `HTTP ${status}` };
  }

  if (status >= 300 && status < 400) {
    return { level: "WARN", reason: `HTTP ${status} unresolved redirect` };
  }

  if (status === 401 || status === 403 || status === 429 || status === 503) {
    return { level: "WARN", reason: `HTTP ${status} (WAF/rate-limit or temporary protection)` };
  }

  return { level: "FAIL", reason: `HTTP ${status}` };
}

/**
 * @param {readonly PortalUrlSource[]} portals
 * @returns {Array<{ url: string; slugs: string[] }>}
 */
export function collectUrlsFromPortals(portals) {
  /** @type {Map<string, Set<string>>} */
  const urlMap = new Map();

  /** @param {string} url @param {string} slug */
  const add = (url, slug) => {
    let set = urlMap.get(url);
    if (!set) {
      set = new Set();
      urlMap.set(url, set);
    }
    set.add(slug);
  };

  for (const portal of portals) {
    add(portal.primaryUrl, portal.slug);
    add(portal.verificationSourceUrl, portal.slug);
    for (const sub of portal.subLinks ?? []) {
      add(sub.url, portal.slug);
    }
  }

  return Array.from(urlMap.entries())
    .map(([url, slugs]) => ({ url, slugs: Array.from(slugs).sort() }))
    .sort((a, b) => a.url.localeCompare(b.url, "en"));
}

/**
 * @param {string} url
 * @param {typeof fetch} [fetchFn]
 */
export async function probeUrl(url, fetchFn = fetch) {
  const headers = {
    "user-agent":
      "Mozilla/5.0 (compatible; GovDirPH-LinkCheck/1.0; +https://github.com/mashudSCK/ph-gov-directory)",
    accept: "text/html,application/xhtml+xml,*/*;q=0.8",
  };

  try {
    let response = await fetchFn(url, {
      method: "HEAD",
      redirect: "follow",
      headers,
      signal: AbortSignal.timeout(10_000),
    });

    if (
      response.status === 400 ||
      response.status === 403 ||
      response.status === 405 ||
      response.status === 406 ||
      response.status === 501
    ) {
      await response.body?.cancel().catch(() => {});
      response = await fetchFn(url, {
        method: "GET",
        redirect: "follow",
        headers,
        signal: AbortSignal.timeout(10_000),
      });
      await response.body?.cancel().catch(() => {});
    }

    return classifyProbeResult({
      status: response.status,
      originalUrl: url,
      finalUrl: response.url || url,
    });
  } catch (error) {
    return classifyProbeResult({ error, originalUrl: url });
  }
}

async function runCli() {
  const dataDir = path.resolve(process.cwd(), "src/data/portals");
  const files = (await readdir(dataDir)).filter((f) => f.endsWith(".json")).sort();
  /** @type {PortalUrlSource[]} */
  const portals = [];

  for (const file of files) {
    const raw = await readFile(path.join(dataDir, file), "utf8");
    portals.push(...JSON.parse(raw));
  }

  const targets = collectUrlsFromPortals(portals);
  const concurrency = 6;
  let index = 0;
  let okCount = 0;
  let warnCount = 0;
  let failCount = 0;

  async function worker() {
    while (index < targets.length) {
      const current = targets[index++];
      const result = await probeUrl(current.url);
      if (result.level === "OK") okCount++;
      else if (result.level === "WARN") warnCount++;
      else failCount++;

      if (result.level !== "OK") {
        console.log(`[${result.level}] ${current.url} (${result.reason}) <- ${current.slugs.join(", ")}`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  console.log(`\nChecked ${targets.length} unique URLs: ${okCount} OK, ${warnCount} WARN, ${failCount} FAIL`);

  if (failCount > 0) {
    process.exitCode = 1;
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  runCli();
}
