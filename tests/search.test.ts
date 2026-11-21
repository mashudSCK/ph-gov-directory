import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeText,
  tokenizeQuery,
  filterAndRankPortals,
  parseFilterState,
} from "../src/lib/search.ts";

const samplePortals = [
  {
    slug: "lto-ltms",
    title: "LTO LTMS Driver's License & Vehicle Portal",
    agency: "Land Transportation Office (LTO)",
    agencyShort: "LTO",
    category: "driving-vehicles" as const,
    coverage: "nationwide" as const,
    summary: "Renew driver's licenses, take CDE exams, and check vehicle violations.",
    aliases: ["lto", "lisensya", "kuha ng lisensya", "student permit", "or cr", "ltms"],
    popular: true,
  },
  {
    slug: "dfa-passport",
    title: "DFA Passport Online Appointment",
    agency: "Department of Foreign Affairs (DFA)",
    agencyShort: "DFA",
    category: "travel-immigration" as const,
    coverage: "nationwide" as const,
    summary: "Schedule a new passport application or renewal slot.",
    aliases: ["passport", "pasaporte", "kuha ng passport", "dfa appointment"],
    popular: true,
  },
  {
    slug: "nbi-clearance",
    title: "NBI Clearance Application",
    agency: "National Bureau of Investigation (NBI)",
    agencyShort: "NBI",
    category: "clearances" as const,
    coverage: "nationwide" as const,
    summary: "Book an NBI clearance appointment or renew an existing clearance.",
    aliases: ["nbi", "kuha ng nbi", "nbi renewal", "hit"],
    popular: true,
  },
  {
    slug: "qc-eservices",
    title: "Quezon City eServices",
    agency: "Quezon City Government",
    agencyShort: "QC LGU",
    category: "local-elections" as const,
    coverage: "city" as const,
    cityName: "Quezon City",
    summary: "Apply for QCID, pay real property tax, and access city permits.",
    aliases: ["qc", "qcid", "quezon city", "business permit qc"],
    popular: false,
  },
];

test("normalizeText strips diacritics, punctuation, and extra spaces", () => {
  assert.equal(normalizeText("  NBI-Clearance! Niño  "), "nbi clearance nino");
  assert.deepEqual(tokenizeQuery("  kuha ng lisensya! "), ["kuha", "ng", "lisensya"]);
  assert.deepEqual(tokenizeQuery("   "), []);
});

test("filterAndRankPortals matches Tagalog/Taglish aliases and punctuation", () => {
  const byTagalog = filterAndRankPortals(samplePortals, {
    q: "kuha ng lisensya",
    category: "all",
    coverage: "all",
  });
  assert.deepEqual(byTagalog.map((p) => p.slug), ["lto-ltms"]);

  const byPunctuated = filterAndRankPortals(samplePortals, {
    q: "  NBI-clearance! ",
    category: "all",
    coverage: "all",
  });
  assert.deepEqual(byPunctuated.map((p) => p.slug), ["nbi-clearance"]);

  const byPassport = filterAndRankPortals(samplePortals, {
    q: "pasaporte",
    category: "all",
    coverage: "all",
  });
  assert.deepEqual(byPassport.map((p) => p.slug), ["dfa-passport"]);
});

test("filterAndRankPortals intersects category and coverage filters", () => {
  const cityOnly = filterAndRankPortals(samplePortals, {
    q: "",
    category: "all",
    coverage: "city",
  });
  assert.deepEqual(cityOnly.map((p) => p.slug), ["qc-eservices"]);

  const emptyIntersection = filterAndRankPortals(samplePortals, {
    q: "",
    category: "clearances",
    coverage: "city",
  });
  assert.deepEqual(emptyIntersection, []);
});

test("filterAndRankPortals ranks agencyShort/title matches above summary matches", () => {
  const ranked = filterAndRankPortals(
    [
      {
        ...samplePortals[1],
        slug: "summary-mention",
        title: "Travel Helper",
        agency: "Other Agency",
        agencyShort: "OTH",
        summary: "Guide for NBI and travel prep.",
        aliases: ["travel"],
      },
      samplePortals[2],
    ],
    { q: "nbi", category: "all", coverage: "all" }
  );
  assert.equal(ranked[0].slug, "nbi-clearance");
});

test("parseFilterState sanitizes unknown cat/cov to all and keeps q as plain text", () => {
  const parsed = parseFilterState(new URLSearchParams("?q=<script>&cat=unknown&cov=mars"));
  assert.deepEqual(parsed, {
    q: "<script>",
    category: "all",
    coverage: "all",
  });

  const valid = parseFilterState(new URLSearchParams("?q=nbi&cat=clearances&cov=nationwide"));
  assert.deepEqual(valid, {
    q: "nbi",
    category: "clearances",
    coverage: "nationwide",
  });
});
