import type { APIRoute } from "astro";
import { loadAllPortals } from "../lib/portals.ts";

const SITE_ORIGIN = "https://govdir.ph-tools.workers.dev";

export const prerender = true;

export const GET: APIRoute = async () => {
  const portals = await loadAllPortals();

  const urls = [
    { loc: `${SITE_ORIGIN}/`, lastmod: undefined },
    { loc: `${SITE_ORIGIN}/trust/`, lastmod: undefined },
    ...portals.map((portal) => ({
      loc: `${SITE_ORIGIN}/services/${portal.slug}/`,
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
