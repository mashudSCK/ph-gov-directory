import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PortalEntrySchema, type PortalEntry } from "./schema.ts";

const DEFAULT_DATA_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../data/portals"
);

export function validatePortalList(rawEntries: readonly unknown[]): PortalEntry[] {
  const seenSlugs = new Set<string>();
  const validated: PortalEntry[] = [];

  for (const raw of rawEntries) {
    const entry = PortalEntrySchema.parse(raw);
    if (seenSlugs.has(entry.slug)) {
      throw new Error(`Duplicate portal slug: ${entry.slug}`);
    }
    seenSlugs.add(entry.slug);
    validated.push(entry);
  }

  return validated.sort((a, b) => {
    if (a.popular !== b.popular) {
      return a.popular ? -1 : 1;
    }
    return a.title.localeCompare(b.title, "en");
  });
}

export async function loadAllPortals(dataDir = DEFAULT_DATA_DIR): Promise<PortalEntry[]> {
  const fileNames = (await readdir(dataDir))
    .filter((name) => name.endsWith(".json"))
    .sort();

  const rawEntries: unknown[] = [];

  for (const fileName of fileNames) {
    const fullPath = path.join(dataDir, fileName);
    const content = await readFile(fullPath, "utf8");
    const parsed: unknown = JSON.parse(content);
    if (!Array.isArray(parsed)) {
      throw new Error(`Expected JSON array in ${fileName}`);
    }
    rawEntries.push(...parsed);
  }

  return validatePortalList(rawEntries);
}

export function getHostname(rawUrl: string): string {
  const hostname = new URL(rawUrl).hostname.toLowerCase();
  return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
}
