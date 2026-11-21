import test from "node:test";
import assert from "node:assert/strict";
import { PortalEntrySchema, SafeUrlSchema, CATEGORIES } from "../src/lib/schema.ts";
import { buildReportUrl, buildSuggestUrl } from "../src/lib/site.ts";

test("SafeUrlSchema allows http/https and rejects javascript/data/ftp", () => {
  assert.equal(SafeUrlSchema.safeParse("https://clearance.nbi.gov.ph/").success, true);
  assert.equal(SafeUrlSchema.safeParse("http://legacy.example.gov.ph/").success, true);
  assert.equal(SafeUrlSchema.safeParse("javascript:alert(1)").success, false);
  assert.equal(SafeUrlSchema.safeParse("data:text/html,hi").success, false);
  assert.equal(SafeUrlSchema.safeParse("ftp://gov.ph").success, false);
  assert.equal(SafeUrlSchema.safeParse("not a url").success, false);
});

test("PortalEntrySchema enforces cityName only when coverage is city and validates lastVerified", () => {
  const base = {
    slug: "qc-eservices",
    title: "Quezon City eServices",
    agency: "Quezon City Government",
    agencyShort: "QC LGU",
    category: "local-elections",
    coverage: "city",
    summary: "Online permits, tax payments, and QCID applications.",
    primaryUrl: "https://qceservices.quezoncity.gov.ph/",
    primaryActionLabel: "Open QC eServices",
    subLinks: [],
    trustTier: "official-gov-ph",
    verificationSourceUrl: "https://quezoncity.gov.ph/",
    verificationNote: "Linked from official Quezon City homepage.",
    lastVerified: "2026-11-21",
    aliases: ["qc", "qcid", "quezon city"],
    popular: true,
    requiresAppointment: false,
    onlineTransaction: "full",
  };
  assert.equal(PortalEntrySchema.safeParse(base).success, false);
  assert.equal(PortalEntrySchema.safeParse({ ...base, cityName: "Quezon City" }).success, true);
  assert.equal(
    PortalEntrySchema.safeParse({ ...base, coverage: "nationwide", cityName: "Quezon City" }).success,
    false
  );
  assert.equal(
    PortalEntrySchema.safeParse({ ...base, cityName: "Quezon City", lastVerified: "21-11-2026" }).success,
    false
  );
  assert.equal(
    PortalEntrySchema.safeParse({
      ...base,
      cityName: "Quezon City",
      subLinks: [{ label: "Bad", url: "javascript:void(0)", kind: "guide" }],
    }).success,
    false
  );
  assert.equal(CATEGORIES.length, 8);
});

test("buildReportUrl and buildSuggestUrl generate safe prefilled https URLs", () => {
  const report = buildReportUrl({
    slug: "nbi-clearance",
    title: "NBI Clearance Application",
    primaryUrl: "https://clearance.nbi.gov.ph/",
  });
  assert.match(report, /^https:\/\/github\.com\/.+\/issues\/new\?/);
  assert.match(report, /nbi-clearance/);
  assert.match(report, /clearance\.nbi\.gov\.ph/);
  assert.match(buildSuggestUrl(), /^https:\/\/github\.com\/.+\/issues\/new\?/);
});
