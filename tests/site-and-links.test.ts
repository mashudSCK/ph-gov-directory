import test from "node:test";
import assert from "node:assert/strict";
import { classifyProbeResult, collectUrlsFromPortals } from "../scripts/check-links.mjs";

test("classifyProbeResult classifies 200 OK, redirects, WAF blocks, and hard failures", () => {
  assert.equal(
    classifyProbeResult({
      status: 200,
      originalUrl: "https://clearance.nbi.gov.ph/",
      finalUrl: "https://clearance.nbi.gov.ph/",
    }).level,
    "OK"
  );

  assert.equal(
    classifyProbeResult({
      status: 200,
      originalUrl: "https://passport.gov.ph/",
      finalUrl: "https://www.passport.gov.ph/",
    }).level,
    "OK"
  );

  assert.equal(
    classifyProbeResult({
      status: 200,
      originalUrl: "https://old.example.gov.ph/",
      finalUrl: "https://new-domain.example.com/",
    }).level,
    "WARN"
  );

  assert.equal(
    classifyProbeResult({
      status: 403,
      originalUrl: "https://portal.lto.gov.ph/",
      finalUrl: "https://portal.lto.gov.ph/",
    }).level,
    "WARN"
  );

  assert.equal(
    classifyProbeResult({
      status: 429,
      originalUrl: "https://online.prc.gov.ph/",
      finalUrl: "https://online.prc.gov.ph/",
    }).level,
    "WARN"
  );

  assert.equal(
    classifyProbeResult({
      status: 404,
      originalUrl: "https://example.gov.ph/missing",
      finalUrl: "https://example.gov.ph/missing",
    }).level,
    "FAIL"
  );

  assert.equal(
    classifyProbeResult({
      error: new Error("ENOTFOUND"),
      originalUrl: "https://nonexistent.gov.ph/",
    }).level,
    "FAIL"
  );

  assert.equal(
    classifyProbeResult({
      error: Object.assign(new Error("timed out"), { name: "TimeoutError" }),
      originalUrl: "https://slow.gov.ph/",
    }).level,
    "WARN"
  );

  assert.equal(
    classifyProbeResult({
      error: Object.assign(new Error("fetch failed"), {
        cause: Object.assign(new Error("unable to verify the first certificate"), {
          code: "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
        }),
      }),
      originalUrl: "https://efps.bir.gov.ph/",
    }).level,
    "WARN"
  );

  assert.equal(
    classifyProbeResult({
      error: Object.assign(new Error("fetch failed"), {
        cause: new Error("Response does not match the HTTP/1.1 protocol (Unexpected whitespace)"),
      }),
      originalUrl: "https://www.pagibigfundservices.com/",
    }).level,
    "WARN"
  );
});

test("collectUrlsFromPortals deduplicates URLs and tracks referencing slugs", () => {
  const urls = collectUrlsFromPortals([
    {
      slug: "a",
      primaryUrl: "https://psa.gov.ph/",
      verificationSourceUrl: "https://psa.gov.ph/",
      subLinks: [{ url: "https://appointment.psa.gov.ph/" }],
    },
    {
      slug: "b",
      primaryUrl: "https://appointment.psa.gov.ph/",
      verificationSourceUrl: "https://psa.gov.ph/",
      subLinks: [],
    },
  ]);

  assert.equal(urls.length, 2);
  const psa = urls.find((item: { url: string; slugs: string[] }) => item.url === "https://psa.gov.ph/");
  assert.deepEqual(psa?.slugs, ["a", "b"]);
});
