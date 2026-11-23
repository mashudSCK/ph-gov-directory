import type { APIRoute } from "astro";
import { loadAllPortals } from "../lib/portals.ts";
import { buildLlmsFullTxt } from "../lib/seo.ts";

export const prerender = true;

export const GET: APIRoute = async () => {
  const portals = await loadAllPortals();
  const body = buildLlmsFullTxt(portals);

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
