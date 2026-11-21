import {
  filterAndRankPortals,
  parseFilterState,
  type CoverageFilter,
  type FilterState,
  type SearchablePortal,
} from "../lib/search.ts";
import type { CategoryId } from "../lib/categories.ts";

const LAST_QUERY_KEY = "govdir:last-query";

function initDirectoryFilter(): void {
  const indexEl = document.getElementById("portal-search-index");
  const formEl = document.getElementById("directory-search-form") as HTMLFormElement | null;
  const inputEl = document.getElementById("portal-search") as HTMLInputElement | null;
  const clearBtn = document.getElementById("search-clear") as HTMLButtonElement | null;
  const gridEl = document.getElementById("portal-grid");
  const countEl = document.getElementById("results-count");
  const liveAnnouncerEl = document.getElementById("results-announcer");
  const emptyEl = document.getElementById("empty-state");
  const resetBtn = document.getElementById("reset-filters") as HTMLButtonElement | null;

  if (!indexEl || !inputEl || !gridEl || !countEl || !emptyEl) {
    return;
  }

  const input = inputEl;
  const grid = gridEl;
  const count = countEl;
  const empty = emptyEl;

  let portals: SearchablePortal[];
  try {
    portals = JSON.parse(indexEl.textContent ?? "[]") as SearchablePortal[];
  } catch {
    return;
  }

  const cardMap = new Map<string, HTMLLIElement>();
  for (const card of grid.querySelectorAll<HTMLLIElement>("[data-portal-card]")) {
    const slug = card.dataset.slug;
    if (slug) {
      cardMap.set(slug, card);
    }
  }

  const coverageButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-coverage-filter]")
  );
  const categoryButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-category-filter]")
  );

  let state: FilterState = parseFilterState(new URLSearchParams(window.location.search));
  let isComposing = false;
  let announceTimer: number | undefined;

  function syncUrlAndStorage(): void {
    const params = new URLSearchParams();
    if (state.q.trim()) {
      params.set("q", state.q.trim());
    }
    if (state.category !== "all") {
      params.set("cat", state.category);
    }
    if (state.coverage !== "all") {
      params.set("cov", state.coverage);
    }

    const queryString = params.toString();
    const nextUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
    window.history.replaceState(null, "", nextUrl);

    try {
      window.sessionStorage.setItem(LAST_QUERY_KEY, queryString ? `?${queryString}` : "");
    } catch {
      // Ignore storage failures in restricted browsing modes
    }
  }

  function scheduleAnnouncement(message: string): void {
    if (!liveAnnouncerEl) {
      return;
    }
    window.clearTimeout(announceTimer);
    announceTimer = window.setTimeout(() => {
      liveAnnouncerEl.textContent = message;
    }, 220);
  }

  function render(announce = true): void {
    input.value = state.q;
    if (clearBtn) {
      clearBtn.hidden = state.q.length === 0;
    }

    for (const btn of coverageButtons) {
      const value = btn.dataset.coverageFilter ?? "all";
      btn.setAttribute("aria-pressed", String(value === state.coverage));
    }

    for (const btn of categoryButtons) {
      const value = btn.dataset.categoryFilter ?? "all";
      btn.setAttribute("aria-pressed", String(value === state.category));
    }

    const matches = filterAndRankPortals(portals, state);
    const matchedSlugs = new Set(matches.map((portal) => portal.slug));

    const fragment = document.createDocumentFragment();
    for (const portal of matches) {
      const card = cardMap.get(portal.slug);
      if (card) {
        card.hidden = false;
        fragment.appendChild(card);
      }
    }

    for (const [slug, card] of cardMap) {
      if (!matchedSlugs.has(slug)) {
        card.hidden = true;
        fragment.appendChild(card);
      }
    }

    grid.appendChild(fragment);
    empty.hidden = matches.length > 0;

    const summary =
      matches.length === portals.length
        ? `Showing all ${portals.length} verified portals`
        : `Showing ${matches.length} of ${portals.length} verified portals`;

    count.textContent = summary;
    if (announce) {
      scheduleAnnouncement(summary);
    }
    syncUrlAndStorage();
  }

  input.addEventListener("compositionstart", () => {
    isComposing = true;
  });

  input.addEventListener("compositionend", () => {
    isComposing = false;
    state = { ...state, q: input.value };
    render(true);
  });

  input.addEventListener("input", () => {
    if (isComposing) {
      return;
    }
    state = { ...state, q: input.value };
    render(true);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (event.isComposing || event.keyCode === 229) {
        return;
      }
      state = { ...state, q: input.value };
      render(true);
    } else if (event.key === "Escape" && state.q.length > 0) {
      state = { ...state, q: "" };
      render(true);
    }
  });

  formEl?.addEventListener("submit", (event) => {
    event.preventDefault();
    state = { ...state, q: input.value };
    render(true);
  });

  clearBtn?.addEventListener("click", () => {
    state = { ...state, q: "" };
    render(true);
    input.focus();
  });

  for (const btn of coverageButtons) {
    btn.addEventListener("click", () => {
      const next = (btn.dataset.coverageFilter ?? "all") as CoverageFilter;
      state = { ...state, coverage: next };
      render(true);
    });
  }

  for (const btn of categoryButtons) {
    btn.addEventListener("click", () => {
      const next = (btn.dataset.categoryFilter ?? "all") as CategoryId | "all";
      state = { ...state, category: next };
      render(true);
    });
  }

  resetBtn?.addEventListener("click", () => {
    state = { q: "", category: "all", coverage: "all" };
    render(true);
    input.focus();
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "/" &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      document.activeElement !== input &&
      !(document.activeElement instanceof HTMLInputElement) &&
      !(document.activeElement instanceof HTMLTextAreaElement)
    ) {
      event.preventDefault();
      input.focus();
    }
  });

  window.addEventListener("popstate", () => {
    state = parseFilterState(new URLSearchParams(window.location.search));
    render(false);
  });

  render(false);
}

initDirectoryFilter();
