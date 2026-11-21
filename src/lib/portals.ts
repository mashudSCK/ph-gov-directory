import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PortalEntrySchema, type PortalEntry } from "./schema.ts";

const DEFAULT_DATA_DIR = path.resolve(process.cwd(), "src/data/portals");

function formatEntryLabel(raw: unknown, index: number, sourceFile?: string): string {
  const slug =
    raw && typeof raw === "object" && "slug" in raw && typeof raw.slug === "string" && raw.slug.trim()
      ? raw.slug.trim()
      : `#${index}`;
  return sourceFile ? `${sourceFile} (${slug})` : slug;
}

export function validatePortalList(
  rawEntries: readonly unknown[],
  sourceFile?: string
): PortalEntry[] {
  const seenSlugs = new Set<string>();
  const validated: PortalEntry[] = [];

  for (let i = 0; i < rawEntries.length; i++) {
    const raw = rawEntries[i];
    const parsed = PortalEntrySchema.safeParse(raw);
    if (!parsed.success) {
      const label = formatEntryLabel(raw, i, sourceFile);
      const details = parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
        .join("; ");
      throw new Error(`Invalid portal entry "${label}": ${details}`);
    }
    const entry = parsed.data;
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

  const seenSlugs = new Set<string>();
  const allValidated: PortalEntry[] = [];

  for (const fileName of fileNames) {
    const fullPath = path.join(dataDir, fileName);
    const content = await readFile(fullPath, "utf8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse JSON in ${fileName}: ${message}`);
    }
    if (!Array.isArray(parsed)) {
      throw new Error(`Expected JSON array in ${fileName}`);
    }
    const fileEntries = validatePortalList(parsed, fileName);
    for (const entry of fileEntries) {
      if (seenSlugs.has(entry.slug)) {
        throw new Error(`Duplicate portal slug across files (${fileName}): ${entry.slug}`);
      }
      seenSlugs.add(entry.slug);
      allValidated.push(entry);
    }
  }

  return allValidated.sort((a, b) => {
    if (a.popular !== b.popular) {
      return a.popular ? -1 : 1;
    }
    return a.title.localeCompare(b.title, "en");
  });
}

export function getHostname(rawUrl: string): string {
  const hostname = new URL(rawUrl).hostname.toLowerCase();
  return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
}
