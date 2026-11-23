export interface SiteConfig {
  name: string;
  origin: string;
  tagline: string;
  disclaimer: string;
  githubRepo: string;
  defaultLastCheckedNote: string;
}

export const SITE_CONFIG: SiteConfig = {
  name: "GovDir PH",
  origin: "https://govdir.ph-tools.workers.dev",
  tagline: "Verified directory of Philippine government portals Filipinos actually use.",
  disclaimer:
    "Independent public-interest directory. Not affiliated with or endorsed by any Philippine government agency. Always verify the domain before entering personal details or making payments.",
  githubRepo: "mashudSCK/ph-gov-directory",
  defaultLastCheckedNote:
    "Every link is verified against an official agency homepage, citizen's charter, or government announcement.",
};

export function buildCanonicalUrl(pathName: string): string {
  const normalized = pathName.startsWith("/") ? pathName : `/${pathName}`;
  return new URL(normalized, SITE_CONFIG.origin).toString();
}

export function buildReportUrl(entry: {
  slug: string;
  title: string;
  primaryUrl: string;
}): string {
  const url = new URL(`https://github.com/${SITE_CONFIG.githubRepo}/issues/new`);
  url.searchParams.set("title", `Broken or changed link: ${entry.title} (${entry.slug})`);
  url.searchParams.set(
    "body",
    [
      `**Portal slug:** \`${entry.slug}\``,
      `**Current URL:** ${entry.primaryUrl}`,
      "",
      "**What happened?** (404, moved domain, suspicious redirect, outdated sub-link)",
      "",
      "**Official replacement URL (if known):**",
    ].join("\n")
  );
  url.searchParams.set("labels", "broken-link");
  return url.toString();
}

export function buildSuggestUrl(): string {
  const url = new URL(`https://github.com/${SITE_CONFIG.githubRepo}/issues/new`);
  url.searchParams.set("title", "Suggest portal: <Service Name>");
  url.searchParams.set(
    "body",
    [
      "**Service / Task Name:**",
      "**Agency / City:**",
      "**Official Portal URL:**",
      "**Official Verification Source (agency homepage or citizen's charter):**",
      "**Common English / Tagalog search terms:**",
    ].join("\n")
  );
  url.searchParams.set("labels", "portal-suggestion");
  return url.toString();
}
