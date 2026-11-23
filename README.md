# GovDir PH

A fast, static directory of verified Philippine government transaction portals. Built so citizens can find the real official portal by task (in English or Tagalog/Taglish) without getting lost in agency homepages or misled by fixer and lookalike sites.

> **Disclaimer:** GovDir PH is an independent public-interest directory and is not affiliated with or endorsed by any Philippine government agency. Always verify the domain in your browser's address bar before entering personal details or making payments.

## Features

- **67 verified portals** across 8 categories and 7 major cities (Quezon City, Manila, Makati, Pasig, Taguig, Cebu City, Davao City).
- **Bilingual task search:** Matches English and everyday Tagalog/Taglish terms (e.g., *kuha ng NBI*, *pasaporte*, *lisensya*, *hulog sa SSS*, *bayad buwis*) with URL-synced filters (`?q=...&cat=...&cov=...`).
- **Three-tier trust labels:** Distinguishes `.gov.ph Verified`, `Official Portal` (agency-operated non-`.gov.ph` domains like `pnpclearance.ph`), and `Authorized Partner` (e.g., `psahelpline.ph`), with clickable official verification sources and scam/fixer warnings.
- **Zero-backend static build:** Pre-renders 69 static HTML pages with Astro and a ~2.8 kB gzipped vanilla TypeScript filter island.
- **Light & dark themes:** Respects `prefers-color-scheme` with a FOUC-free manual toggle persisted in `localStorage`.

## Tech Stack

- **Framework:** [Astro 5](https://astro.build/) (`output: "static"`)
- **Validation:** [Zod](https://zod.dev/) + strict TypeScript (`tsc --noEmit`)
- **Testing:** Node native test runner (`node --test`)
- **Container:** Multi-stage `node:22-alpine` → `nginxinc/nginx-unprivileged:1.27-alpine`

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:4321/`.

### Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start local Astro dev server |
| `npm run build` | Validate data and build static site into `dist/` |
| `npm run preview` | Preview the built `dist/` site locally |
| `npm run check` | Run TypeScript type checking (`tsc --noEmit`) |
| `npm test` | Run schema, search, portal dataset, and link-checker unit tests |
| `npm run check:links` | Probe all curated portal and verification URLs for health/redirects |

## Self-Hosting with Docker

```bash
docker compose up --build -d
```

The site is served on port `8080` (`PORT=8080` by default) with a built-in container healthcheck.

## Project Structure

```text
├── public/
│   └── favicon.svg                 # 8-rayed Philippine sun geometric mark
├── scripts/
│   └── check-links.mjs             # Live URL health and redirect checker
├── src/
│   ├── components/
│   │   ├── PortalCard.astro        # Compact directory row item
│   │   └── TrustBadge.astro        # Trust tier indicator
│   ├── data/portals/               # 8 Zod-validated JSON category datasets
│   ├── layouts/
│   │   └── BaseLayout.astro        # Sticky header, theme toggle, footer
│   ├── lib/
│   │   ├── categories.ts           # Category metadata
│   │   ├── portals.ts              # Dataset loader & uniqueness validation
│   │   ├── schema.ts               # Zod schemas & URL safety rules
│   │   ├── search.ts               # Bilingual tokenization & ranking
│   │   └── site.ts                 # Site metadata & GitHub issue link builders
│   ├── pages/
│   │   ├── index.astro             # Main searchable directory
│   │   ├── trust.astro             # Verification policy & safety checklist
│   │   └── services/[slug].astro   # Static detail & verification pages
│   ├── scripts/
│   │   └── directory-filter.ts     # Client-side filter, pagination, URL sync
│   └── styles/
│       └── global.css              # Civic light/dark tokens & responsive styles
├── tests/                          # Unit & dataset integrity tests
├── Dockerfile
└── compose.yaml
```

## Contributing a Portal or Fix

Portal entries live as JSON arrays in `src/data/portals/*.json` and are validated against `PortalEntrySchema` in `src/lib/schema.ts` during builds and tests.

1. Add or update an entry in the matching category file under `src/data/portals/` with a valid `verificationSourceUrl` (official agency homepage, citizen's charter, or announcement) and `lastVerified` (`YYYY-MM-DD`).
2. Run verification before opening a pull request:

```bash
npm run check
npm test
npm run build
```

You can also report a broken link or suggest a portal directly via GitHub Issues using the links in the app.
