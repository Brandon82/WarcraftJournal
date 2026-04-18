# WarcraftJournal

**[warcraftjournal.app](https://warcraftjournal.app)**

A web-based World of Warcraft Adventure Guide and Mythic+ companion. Browse dungeon and raid encounters across every expansion, study boss abilities and loot, reference trash spells, and plan Mythic+ pulls on interactive dungeon maps.

Built with React, TypeScript, and Vite. All WoW data is pre-fetched from the Blizzard API at build time and served as static JSON — the app makes zero runtime API calls.

## Features

### Adventure Journal
- Browse dungeons and raids for every WoW expansion
- View boss abilities organized as a recursive section tree that mirrors the in-game journal
- Filter encounters by difficulty (Normal, Heroic, Mythic, LFR)
- Loot tables with item-quality coloring
- Zone spell / trash ability reference for dungeons, including interrupt tagging
- Inline `[bracketed]` spell references rendered as Wowhead tooltip links

### Mythic+ Routes
- Interactive dungeon map editor (Leaflet-based) for the current M+ season
- Select mob spawns to build pulls, with notes, prev/next pull navigation, and a dedicated abilities view per pull
- Import existing MDT route strings from the clipboard, or export your own
- NPC tier coloring in a Plater-style palette (caster / elite / boss tiers), with a nameplate colors settings panel
- Top-5 Raider.IO runs per dungeon, auto-refreshed daily via GitHub Actions and served as featured routes
- Save routes to `localStorage` with editable names; landing page shows dungeon tiles, featured runs, and saved routes

### Season & Navigation
- Current Mythic+ season overview with quick access to seasonal dungeons and the seasonal raid
- Global search (Ctrl+K) across all instances and encounters
- Breadcrumb navigation and a collapsible sidebar that becomes a mobile drawer under 768px
- Dark and light themes (persisted to `localStorage`)
- Changelog page listing recent GitHub commits
- Curated list of community tools (Raider.IO, Wowhead, Warcraft Logs, Three Chest, etc.)

## Getting Started

### Prerequisites

- Node.js 18+ (see `.nvmrc`)
- A Blizzard API application for data fetching (optional — the repo ships with pre-generated data)

### Installation

```bash
npm install
```

### Development

```bash
npm run dev       # Vite dev server on port 5173
npm run build     # TypeScript check (tsc -b) + Vite production build
npm run lint      # ESLint
npm run preview   # Preview the production build locally
```

There are no tests; `tsc -b && vite build` is the primary correctness check.

### Data Fetching (optional)

To refresh the bundled JSON from upstream sources:

1. Copy the env template and add your Blizzard API credentials:
   ```bash
   cp .env.example .env
   # BLIZZARD_CLIENT_ID=...
   # BLIZZARD_CLIENT_SECRET=...
   ```
2. Run one of:
   ```bash
   npm run fetch-data              # Current expansion only
   npm run fetch-data:all          # All expansions (slow, rate-limited)
   npm run fetch-data:zone-spells  # Zone spells only
   npm run fetch-raiderio-routes   # Top M+ routes per dungeon from raider.io
   ```

Register a Blizzard API app at [develop.battle.net](https://develop.battle.net/). The raider.io scraper does not require credentials.

## Architecture

### Overview

WarcraftJournal is a single-page application with no backend. The Blizzard API and raider.io are only consulted at build time (or by the scheduled GitHub Action). At runtime the app reads from static JSON bundled into the build.

### Data Pipeline

`scripts/fetch-data.ts` handles the main pipeline:

1. Authenticates with the Blizzard OAuth2 API
2. Fetches expansion, instance, encounter, item, and zone-spell data
3. Scrapes Wowhead for missing spell descriptions and NPC classification tiers
4. Applies manual overrides (`ZONE_NPC_OVERRIDES`, `INSTANCE_IGNORED_NPC_NAMES`) for accuracy
5. Writes JSON files to `src/data/generated/`:
   - `expansions.json` — expansion metadata
   - `instances.json` — dungeons and raids
   - `encounters.json` — boss encounters with ability trees
   - `zone-spells.json` — dungeon trash abilities with interrupt flags and NPC tiers

`scripts/fetch-raiderio-routes.ts` pulls the top-ranked timed M+ runs for each current-season dungeon from raider.io, resolves the attached keystone.guru route, validates the MDT string with the app's own decoder, and writes `raiderio-routes.json`. A GitHub Action (`.github/workflows/update-raiderio-routes.yml`) runs this daily at 06:00 UTC and commits any diff.

The data layer (`src/data/index.ts`) imports these JSON files and builds `Map<slug, T>` and `Map<id, T>` lookups for O(1) access. Helper functions (`getInstancesForExpansion`, `getEncountersForInstance`, `filterSectionsByDifficulty`) are the query interface used by page components.

Current-season configuration lives in `src/data/currentSeason.ts` as dungeon and raid slug arrays.

### Routing

React Router 7 with nested, slug-based routes:

| Route | Page |
|---|---|
| `/` | Home (expansion list + current season) |
| `/season` | Current M+ season overview |
| `/season/:instanceSlug` | Instance within the current season |
| `/season/:instanceSlug/:bossSlug` | Encounter within the current season |
| `/tools` | Community tool links |
| `/tools/mdt-route` | Mythic+ route editor (map, pulls, MDT import/export) |
| `/changelog` | Recent GitHub commits |
| `/:expansionSlug` | Expansion page (instance grid) |
| `/:expansionSlug/:instanceSlug` | Instance page (encounter grid + zone spells) |
| `/:expansionSlug/:instanceSlug/:bossSlug` | Encounter page (abilities, loot, overview) |

Routes are defined in `src/router.tsx`; pages live in `src/pages/`.

### State Management

URL-driven, minimal contexts — no Redux or external store:

- `JournalContext` — difficulty and active tab via `useSearchParams`
- `ThemeContext` — dark/light theme, persisted to `localStorage`
- `LayoutContext` — sidebar/drawer state
- `DevModeContext` — dev info panel, persisted to `localStorage`
- `NameplateColorsContext` — user-customizable Plater-style NPC tier palette

### Component Organization

```
src/components/
  cards/          InstanceCard, EncounterCard (grid display)
  encounter/      OverviewTab, AbilitiesTab, LootTab, DifficultySelector
  sections/       SectionTree, SectionNode (recursive boss ability trees)
  zone-spells/    ZoneSpellSection (dungeon trash abilities)
  mdt/            DungeonMap, RouteBuilderControls, MobInfoPanel,
                  SpawnContextMenu, RouteLandingView, SavedRouteCard,
                  FeaturedRouteCard, MapLayersControl, MapNoteEditor, …
  navigation/     ExpansionMenu (sidebar), SearchBar (Ctrl+K), BreadcrumbNav
  loot/           Loot rendering
  ui/, dev/       Shared UI primitives and dev tools

src/layouts/
  AppLayout.tsx   Root layout with responsive sidebar/drawer + sticky header
```

MDT route encoding/decoding utilities live under `src/lib/mdt/` (shared by both the editor and the raider.io scraper) and use `pako` for the LibCompress-compatible deflate step.

### Styling

- **Tailwind CSS 4** utilities
- **Ant Design 6** components (cards, menus, tabs, tooltips, modals)
- **Leaflet / react-leaflet** for dungeon maps
- CSS custom properties in `src/theme/global.css` define the WoW-themed dark and light palettes
- Ant Design theme tokens in `src/theme/tokens.ts`
- Responsive breakpoint at 768px

### Types

TypeScript types in `src/types/` mirror the Blizzard API structure:

- `JournalExpansion` → `JournalInstance` → `JournalEncounter` → `JournalSection` (recursive)
- `JournalItem` for loot
- `ZoneSpellData` for dungeon trash spells, NPC tiers, and interrupt flags
- Enums: `Difficulty`, `ItemQuality`, `SectionHeaderIcon`

## Tech Stack

- [React 19](https://react.dev/) + [TypeScript 6](https://www.typescriptlang.org/)
- [Vite 8](https://vite.dev/) (build tool + dev server)
- [React Router 7](https://reactrouter.com/)
- [Ant Design 6](https://ant.design/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Leaflet](https://leafletjs.com/) + [react-leaflet](https://react-leaflet.js.org/) (dungeon maps)
- [pako](https://github.com/nodeca/pako) (MDT route string deflate/inflate)
- [Blizzard API](https://develop.battle.net/documentation/world-of-warcraft) + [Raider.IO](https://raider.io/api) (build-time data sources)

Deployed on Vercel with SPA rewrite (`vercel.json`).
