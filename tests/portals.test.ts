import test from "node:test";
import assert from "node:assert/strict";
import { validatePortalList, getHostname } from "../src/lib/portals.ts";

const makeSample = (overrides: Record<string, unknown> = {}) => ({
  slug: "nbi-clearance",
  title: "NBI Clearance Application",
  agency: "National Bureau of Investigation (NBI)",
  agencyShort: "NBI",
  category: "clearances",
  coverage: "nationwide",
  summary: "Book an NBI clearance appointment or renew an existing clearance online.",
  primaryUrl: "https://clearance.nbi.gov.ph/",
  primaryActionLabel: "Open NBI Clearance Portal",
  subLinks: [],
  trustTier: "official-gov-ph",
  verificationSourceUrl: "https://www.nbi.gov.ph/",
  verificationNote: "Official clearance portal linked from nbi.gov.ph.",
  lastVerified: "2026-11-21",
  aliases: ["nbi", "clearance", "kuha ng nbi"],
  popular: true,
  requiresAppointment: true,
  onlineTransaction: "partial",
  ...overrides,
});

test("validatePortalList rejects duplicate slugs", () => {
  assert.throws(
    () => validatePortalList([makeSample(), makeSample({ title: "Duplicate NBI" })]),
    /Duplicate portal slug: nbi-clearance/
  );
});

test("validatePortalList sorts popular portals first, then alphabetically by title", () => {
  const result = validatePortalList([
    makeSample({ slug: "zebra", title: "Zebra Portal", popular: false }),
    makeSample({ slug: "alpha", title: "Alpha Portal", popular: false }),
    makeSample({ slug: "pop-b", title: "Beta Popular", popular: true }),
    makeSample({ slug: "pop-a", title: "Apex Popular", popular: true }),
  ]);
  assert.deepEqual(
    result.map((p) => p.slug),
    ["pop-a", "pop-b", "alpha", "zebra"]
  );
});

test("getHostname strips www prefix and returns clean hostname", () => {
  assert.equal(getHostname("https://www.psaserbilis.com.ph/default.aspx"), "psaserbilis.com.ph");
  assert.equal(getHostname("https://clearance.nbi.gov.ph/"), "clearance.nbi.gov.ph");
});
