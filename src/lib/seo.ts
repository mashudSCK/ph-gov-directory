import { CATEGORIES, CATEGORY_LABEL_MAP } from "./categories.ts";
import type { PortalEntry } from "./schema.ts";
import { SITE_CONFIG, buildCanonicalUrl } from "./site.ts";

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function buildHomeStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_CONFIG.name,
    url: buildCanonicalUrl("/"),
    description: SITE_CONFIG.tagline,
    potentialAction: {
      "@type": "SearchAction",
      target: `${buildCanonicalUrl("/")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildTrustStructuredData() {
  const trustUrl = buildCanonicalUrl("/trust/");
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "How We Verify Links",
      url: trustUrl,
      description:
        "How GovDir PH verifies official Philippine government domains, non-.gov.ph portals, and authorized partners.",
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Directory",
          item: buildCanonicalUrl("/"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "How We Verify Links",
          item: trustUrl,
        },
      ],
    },
  ];
}

export function buildPortalStructuredData(portal: PortalEntry) {
  const portalUrl = buildCanonicalUrl(`/services/${portal.slug}/`);
  const categoryLabel = CATEGORY_LABEL_MAP[portal.category];
  const areaServed =
    portal.coverage === "city" && portal.cityName
      ? { "@type": "City", name: `${portal.cityName}, Philippines` }
      : { "@type": "Country", name: "Philippines" };

  return [
    {
      "@context": "https://schema.org",
      "@type": "GovernmentService",
      name: portal.title,
      description: portal.summary,
      url: portalUrl,
      serviceType: categoryLabel,
      areaServed,
      provider: {
        "@type": "GovernmentOrganization",
        name: portal.agency,
      },
      mainEntityOfPage: portalUrl,
      sameAs: portal.primaryUrl,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Directory",
          item: buildCanonicalUrl("/"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: portal.title,
          item: portalUrl,
        },
      ],
    },
  ];
}

export function buildLlmsTxt(portals: readonly PortalEntry[]): string {
  const lines: string[] = [
    `# ${SITE_CONFIG.name}`,
    "",
    `> ${SITE_CONFIG.tagline} ${SITE_CONFIG.defaultLastCheckedNote}`,
    "",
    `- [Directory Home](${buildCanonicalUrl("/")})`,
    `- [Verification & Trust Policy](${buildCanonicalUrl("/trust/")})`,
    `- [Full Verified Portal Index](${buildCanonicalUrl("/llms-full.txt")})`,
    "",
  ];

  for (const category of CATEGORIES) {
    const items = portals.filter((p) => p.category === category.id);
    if (items.length === 0) continue;
    lines.push(`## ${category.label}`);
    lines.push("");
    for (const portal of items) {
      const detailUrl = buildCanonicalUrl(`/services/${portal.slug}/`);
      lines.push(
        `- [${portal.title}](${detailUrl}): ${portal.primaryUrl} — ${portal.summary}`
      );
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function buildLlmsFullTxt(portals: readonly PortalEntry[]): string {
  const lines: string[] = [
    `# ${SITE_CONFIG.name} — Full Verified Portal Index`,
    "",
    `> ${SITE_CONFIG.tagline}`,
    `> ${SITE_CONFIG.disclaimer}`,
    `> Total verified portals: ${portals.length}`,
    "",
  ];

  for (const category of CATEGORIES) {
    const items = portals.filter((p) => p.category === category.id);
    if (items.length === 0) continue;
    lines.push(`## ${category.label}`);
    lines.push("");
    for (const portal of items) {
      const scope =
        portal.coverage === "city" && portal.cityName ? portal.cityName : "Nationwide";
      lines.push(`### ${portal.title}`);
      lines.push(`- **Agency:** ${portal.agency} (${portal.agencyShort})`);
      lines.push(`- **Coverage:** ${scope}`);
      lines.push(`- **Official URL:** ${portal.primaryUrl}`);
      lines.push(`- **Directory Page:** ${buildCanonicalUrl(`/services/${portal.slug}/`)}`);
      lines.push(`- **Trust Tier:** ${portal.trustTier}`);
      lines.push(`- **Online Transaction:** ${portal.onlineTransaction}`);
      lines.push(`- **Summary:** ${portal.summary}`);
      lines.push(`- **Verification Source:** ${portal.verificationSourceUrl} (checked ${portal.lastVerified})`);
      if (portal.scamWarning) {
        lines.push(`- **Scam Warning:** ${portal.scamWarning}`);
      }
      if (portal.subLinks.length > 0) {
        lines.push(
          `- **Related Official Links:** ${portal.subLinks
            .map((sub) => `${sub.label} (${sub.url})`)
            .join("; ")}`
        );
      }
      lines.push("");
    }
  }

  return lines.join("\n").trimEnd() + "\n";
}
