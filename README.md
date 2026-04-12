# WarcraftJournal

**[warcraftjournal.app](https://warcraftjournal.app)**

A web-based World of Warcraft Adventure Guide that displays dungeon and raid encounter data, boss abilities, loot tables, and zone spells across all expansions.

Built with React, TypeScript, and Vite. All encounter data is pre-fetched from the Blizzard API and served as static JSON, so the app requires no runtime API calls.

## Features

- Browse dungeons and raids for every WoW expansion
- View boss abilities organized in a recursive section tree (mirrors the in-game journal)
- Filter encounters by difficulty (Normal, Heroic, Mythic, LFR)
- Loot tables with item quality indicators
- Zone spell / trash ability reference for dungeons
- Current M+ season overview with quick access to seasonal dungeons and raids
- Dark and light theme support
- Global search (Ctrl+K) across all instances and encounters
- Fully responsive layout with a collapsible sidebar

## Getting Started

### Prerequisites

- Node.js 18+
- A Blizzard API application for data fetching (optional if using existing generated data)

### Installation

```bash
npm install
```

### Data Fetching (optional)

The repository includes pre-generated data files. To refresh them from the Blizzard API:

1. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
2. Add your Blizzard API credentials:
   ```
   BLIZZARD_CLIENT_ID=your_client_id
   BLIZZARD_CLIENT_SECRET=your_client_secret
   ```
3. Run the fetch script:
   ```bash
   npm run fetch-data         # Current expansion only
   npm run fetch-data:all     # All expansions (slow, rate-limited)
   npm run fetch-data:zone-spells  # Zone spells only
   ```

You can register a Blizzard API application at [develop.battle.net](https://develop.battle.net/).

### Development

```bash
npm run dev     # Start Vite dev server on port 5173
npm run build   # TypeScript check + production build
npm run lint    # Run ESLint
```

## Architecture

### Overview

WarcraftJournal is a single-page application with no backend. The Blizzard API is only used at build time via a data-fetching script. At runtime, the app reads from four static JSON files bundled into the build.

### Data Pipeline

The fetch script (`scripts/fetch-data.ts`) handles the full data pipeline:

1. Authenticates with the Blizzard OAuth2 API
2. Fetches expansion, instance, encounter, item, and zone spell data
3. Scrapes Wowhead for any missing spell descriptions
4. Writes four JSON files to `src/data/generated/`:
   - `expansions.json` - expansion metadata
   - `instances.json` - dungeons and raids
   - `encounters.json` - boss encounters with ability trees
   - `zone-spells.json` - dungeon trash abilities

The data layer (`src/data/index.ts`) imports these JSON files and builds `Map` lookups by slug and ID for fast access. Helper functions like `getInstancesForExpansion` and `getEncountersForInstance` provide the query interface used by page components.

Season configuration lives in `src/data/currentSeason.ts`, where dungeon and raid slug arrays define the current M+ rotation.

### Routing

React Router 7 with nested, slug-based routes:

| Route | Page |
|---|---|
| `/` | Home (expansion list + current season) |
| `/season` | Current M+ season overview |
| `/season/:instanceSlug` | Instance within the current season |
| `/season/:instanceSlug/:bossSlug` | Encounter within the current season |
| `/tools` | Community resource links |
| `/:expansionSlug` | Expansion page (instance grid) |
| `/:expansionSlug/:instanceSlug` | Instance page (encounter grid + zone spells) |
| `/:expansionSlug/:instanceSlug/:bossSlug` | Encounter page (abilities, loot, overview) |

Routes are defined in `src/router.tsx`. Page components live in `src/pages/`.

### State Management

The app uses minimal state:

- **URL search params** (`?difficulty=&tab=`) managed by `JournalContext` via `useSearchParams` for difficulty filtering and tab selection
- **Theme** (dark/light) managed by `ThemeContext`, persisted to `localStorage`

No global store or external state library is needed since navigation state is derived entirely from the URL.

### Component Organization

```
src/components/
  cards/          InstanceCard, EncounterCard (grid display)
  encounter/      OverviewTab, AbilitiesTab, LootTab, DifficultySelector
  sections/       SectionTree, SectionNode (recursive boss ability trees)
  navigation/     ExpansionMenu (sidebar), SearchBar (Ctrl+K), BreadcrumbNav
  zone-spells/    ZoneSpellSection (dungeon trash abilities)

src/layouts/
  AppLayout.tsx   Root layout with responsive sidebar/drawer + sticky header
```

### Styling

- **Tailwind CSS 4** for utility-based styling
- **Ant Design 6** for UI components (cards, menus, tabs, tooltips)
- CSS custom properties in `src/theme/global.css` define dark and light color palettes
- Ant Design theme tokens are configured in `src/theme/tokens.ts`

### Types

TypeScript types in `src/types/` mirror the Blizzard API structure:

- `JournalExpansion` > `JournalInstance` > `JournalEncounter` > `JournalSection` (recursive tree)
- `JournalItem` for loot data
- `ZoneSpellData` for dungeon trash spells
- Enums: `Difficulty`, `ItemQuality`, `SectionHeaderIcon`

## Tech Stack

- [React 19](https://react.dev/) + [TypeScript 6](https://www.typescriptlang.org/)
- [Vite 8](https://vite.dev/) (build tool + dev server)
- [React Router 7](https://reactrouter.com/)
- [Ant Design 6](https://ant.design/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Blizzard API](https://develop.battle.net/documentation/world-of-warcraft) (build-time data source)
