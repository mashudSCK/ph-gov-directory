import test from "node:test";
import assert from "node:assert/strict";
import { buildCanonicalUrl, SITE_CONFIG } from "../src/lib/site.ts";
import {
  buildHomeStructuredData,
  buildLlmsFullTxt,
  buildLlmsTxt,
  buildPortalStructuredData,
  buildTrustStructuredData,
  serializeJsonLd,
} from "../src/lib/seo.ts";
import { loadAllPortals } from "../src/lib/portals.ts";

test("buildCanonicalUrl normalizes paths against SITE_CONFIG.origin", () => {
  assert.equal(buildCanonicalUrl("/"), `${SITE_CONFIG.origin}/`);
  assert.equal(buildCanonicalUrl("trust/"), `${SITE_CONFIG.origin}/trust/`);
  assert.equal(
    buildCanonicalUrl("/services/nbi-clearance/"),
    `${SITE_CONFIG.origin}/services/nbi-clearance/`
  );
});

test("serializeJsonLd escapes < characters for safe script embedding", () => {
  const output = serializeJsonLd({ text: "</script><script>alert(1)</script>" });
  assert.equal(output.includes("<"), false);
  assert.equal(output.includes("\\u003c/script>"), true);
});

test("structured data builders emit valid Schema.org graphs", async () => {
  const home = buildHomeStructuredData();
  assert.equal(home["@type"], "WebSite");
  assert.equal(home.url, `${SITE_CONFIG.origin}/`);

  const trust = buildTrustStructuredData();
  assert.equal(trust.length, 2);
  assert.equal(trust[0]["@type"], "WebPage");
  assert.equal(trust[1]["@type"], "BreadcrumbList");

  const portals = await loadAllPortals();
  const sample = portals[0];
  const portalSchema = buildPortalStructuredData(sample);
  assert.equal(portalSchema.length, 2);
  assert.equal(portalSchema[0]["@type"], "GovernmentService");
  assert.equal(portalSchema[0].sameAs, sample.primaryUrl);
  assert.equal(portalSchema[1]["@type"], "BreadcrumbList");
});

test("buildLlmsTxt and buildLlmsFullTxt include all verified portals", async () => {
  const portals = await loadAllPortals();
  const compact = buildLlmsTxt(portals);
  const full = buildLlmsFullTxt(portals);

  assert.equal(compact.startsWith(`# ${SITE_CONFIG.name}`), true);
  assert.equal(compact.includes("/llms-full.txt"), true);
  assert.equal(full.includes(`Total verified portals: ${portals.length}`), true);

  for (const portal of portals) {
    assert.equal(compact.includes(portal.primaryUrl), true, `llms.txt missing ${portal.slug}`);
    assert.equal(full.includes(portal.primaryUrl), true, `llms-full.txt missing ${portal.slug}`);
  }
});
