import type { APIRoute } from "astro";
import { loadAllPortals } from "../lib/portals.ts";
import { buildCanonicalUrl } from "../lib/site.ts";

export const prerender = true;

export const GET: APIRoute = async () => {
  const portals = await loadAllPortals();

  const urls = [
    { loc: buildCanonicalUrl("/"), lastmod: undefined },
    { loc: buildCanonicalUrl("/trust/"), lastmod: undefined },
    ...portals.map((portal) => ({
      loc: buildCanonicalUrl(`/services/${portal.slug}/`),
      lastmod: portal.lastVerified,
    })),
  ];

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((entry) =>
      entry.lastmod
        ? `  <url><loc>${entry.loc}</loc><lastmod>${entry.lastmod}</lastmod></url>`
        : `  <url><loc>${entry.loc}</loc></url>`
    ),
    "</urlset>",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
};
