import { LinkOutlined } from '@ant-design/icons';

interface Tool {
  name: string;
  url: string;
  description: string;
  logo: string;
}

const tools: Tool[] = [
  {
    name: 'Raider.IO',
    url: 'https://raider.io/',
    description: 'Mythic+ scores, rankings, and character lookup.',
    logo: '/logos/raiderio.png',
  },
  {
    name: 'Wowhead',
    url: 'https://www.wowhead.com/',
    description: 'Comprehensive WoW database for items, quests, spells, and guides.',
    logo: '/logos/wowhead.png',
  },
  {
    name: 'Warcraft Logs',
    url: 'https://www.warcraftlogs.com/',
    description: 'Combat log analysis, rankings, and raid performance tracking.',
    logo: '/logos/warcraftlogs.png',
  },
  {
    name: 'Three Chest',
    url: 'http://threechest.io/',
    description: 'Mythic+ dungeon routing and strategy tool.',
    logo: '/logos/threechest.png',
  },
  {
    name: 'SimC Rotation Guides',
    url: 'https://simc-rotation.app/',
    description: 'SimulationCraft-based rotation guides and priority lists.',
    logo: '/logos/simcguides.svg',
  },
  {
    name: 'Not Even Close',
    url: 'https://not-even-close.com/',
    description: 'Analyze how close you were to dying in your raids and dungeons.',
    logo: '/logos/notevenclose.png',
  },
  {
    name: 'Lorrgs',
    url: 'https://lorrgs.io/',
    description: 'Cooldown and spell timeline analysis for top raid logs.',
    logo: '/logos/lorrgs.svg',
  },
  {
    name: 'RaidPlan',
    url: 'https://raidplan.io/',
    description: 'Visual raid planning and strategy mapping tool.',
    logo: '/logos/raidplan.png',
  },
];

export default function ToolsPage() {
  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-semibold text-wow-gold mb-2 tracking-wide">
        Useful Tools
      </h2>
      <p className="text-wow-text-secondary mb-8">
        A collection of community tools for World of Warcraft.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {tools.map((tool) => (
          <a
            key={tool.url}
            href={tool.url}
            target="_blank"
            rel="noopener noreferrer"
            className="no-underline block group"
          >
            <div
              className="relative overflow-hidden rounded-xl border border-wow-border hover:border-wow-gold-muted transition-all duration-300 cursor-pointer bg-wow-bg-surface"
              style={{ boxShadow: 'var(--wow-card-shadow)' }}
            >
              <div className="p-5 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <img
                    src={tool.logo}
                    alt={`${tool.name} logo`}
                    className="w-6 h-6 rounded object-contain"
                  />
                  <h3 className="text-lg font-semibold m-0 text-wow-gold group-hover:text-wow-gold-bright transition-colors duration-150">
                    {tool.name}
                  </h3>
                  <LinkOutlined className="text-wow-text-dim text-xs ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
                </div>
                <p className="text-sm m-0 text-wow-text-secondary">
                  {tool.description}
                </p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
