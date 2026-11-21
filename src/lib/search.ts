import { CATEGORY_IDS, type CategoryId } from "./categories.ts";

export type CoverageFilter = "all" | "nationwide" | "city";

export interface FilterState {
  q: string;
  category: CategoryId | "all";
  coverage: CoverageFilter;
}

export interface SearchablePortal {
  slug: string;
  title: string;
  agency: string;
  agencyShort: string;
  category: CategoryId;
  coverage: "nationwide" | "city";
  cityName?: string;
  summary: string;
  aliases: readonly string[];
  popular: boolean;
}

const VALID_CATEGORIES = new Set<string>(CATEGORY_IDS);
const VALID_COVERAGES = new Set<string>(["all", "nationwide", "city"]);
const QUERY_STOPWORDS = new Set<string>([
  "ng",
  "sa",
  "ang",
  "na",
  "mga",
  "paano",
  "saan",
  "para",
  "po",
  "kumuha",
  "how",
  "to",
  "get",
  "where",
  "the",
  "for",
  "of",
  "in",
  "on",
  "a",
  "an",
  "my",
]);

export function normalizeText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/['’]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function tokenizeQuery(query: string): string[] {
  const normalized = normalizeText(query);
  if (!normalized) {
    return [];
  }
  const tokens = normalized.split(" ").filter(Boolean);
  const meaningful = tokens.filter((token) => !QUERY_STOPWORDS.has(token));
  return meaningful.length > 0 ? meaningful : tokens;
}

function includesWordPrefix(haystack: string, token: string): boolean {
  return haystack === token || haystack.startsWith(`${token}`) || haystack.includes(` ${token}`);
}

export function scorePortal(
  portal: Pick<
    SearchablePortal,
    "title" | "agency" | "agencyShort" | "cityName" | "summary" | "aliases" | "popular"
  >,
  tokens: readonly string[]
): number {
  if (tokens.length === 0) {
    return portal.popular ? 10 : 1;
  }

  const title = normalizeText(portal.title);
  const agencyShort = normalizeText(portal.agencyShort);
  const agency = normalizeText(portal.agency);
  const city = portal.cityName ? normalizeText(portal.cityName) : "";
  const summary = normalizeText(portal.summary);
  const aliases = portal.aliases.map((alias) => normalizeText(alias));
  const combinedAlias = aliases.join(" ");

  let totalScore = 0;

  for (const token of tokens) {
    let tokenScore = 0;

    if (agencyShort === token || title === token) {
      tokenScore = 100;
    } else if (includesWordPrefix(agencyShort, token) || includesWordPrefix(title, token)) {
      tokenScore = 70;
    } else if (aliases.some((alias) => alias === token || includesWordPrefix(alias, token))) {
      tokenScore = 55;
    } else if (city && includesWordPrefix(city, token)) {
      tokenScore = 50;
    } else if (includesWordPrefix(agency, token)) {
      tokenScore = 40;
    } else if (
      title.includes(token) ||
      combinedAlias.includes(token) ||
      agency.includes(token) ||
      city.includes(token)
    ) {
      tokenScore = 25;
    } else if (summary.includes(token)) {
      tokenScore = 15;
    }

    if (tokenScore === 0) {
      return 0;
    }
    totalScore += tokenScore;
  }

  // Bonus if full normalized query appears as a phrase in aliases or title
  const fullPhrase = tokens.join(" ");
  if (tokens.length > 1) {
    if (title.includes(fullPhrase)) {
      totalScore += 40;
    } else if (aliases.some((alias) => alias.includes(fullPhrase))) {
      totalScore += 35;
    }
  }

  if (portal.popular) {
    totalScore += 5;
  }

  return totalScore;
}

export function filterAndRankPortals<T extends SearchablePortal>(
  portals: readonly T[],
  state: FilterState
): T[] {
  const tokens = tokenizeQuery(state.q);
  const scored: Array<{ portal: T; score: number }> = [];

  for (const portal of portals) {
    if (state.category !== "all" && portal.category !== state.category) {
      continue;
    }
    if (state.coverage !== "all" && portal.coverage !== state.coverage) {
      continue;
    }

    const score = scorePortal(portal, tokens);
    if (score > 0) {
      scored.push({ portal, score });
    }
  }

  if (tokens.length === 0) {
    return scored.map((item) => item.portal);
  }

  return scored
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (a.portal.popular !== b.portal.popular) {
        return a.portal.popular ? -1 : 1;
      }
      return a.portal.title.localeCompare(b.portal.title, "en");
    })
    .map((item) => item.portal);
}

export function parseFilterState(searchParams: URLSearchParams): FilterState {
  const q = searchParams.get("q") ?? "";
  const rawCat = searchParams.get("cat") ?? "all";
  const rawCov = searchParams.get("cov") ?? "all";

  return {
    q,
    category: VALID_CATEGORIES.has(rawCat) ? (rawCat as CategoryId) : "all",
    coverage: VALID_COVERAGES.has(rawCov) ? (rawCov as CoverageFilter) : "all",
  };
}
