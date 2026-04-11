import { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router';
import { RightOutlined } from '@ant-design/icons';
import { instanceBySlug } from '../../data';
import { currentSeason } from '../../data/currentSeason';

interface ExpansionMenuProps {
  onNavigate?: () => void;
}

interface NavInstance {
  slug: string;
  name: string;
  encounters: { slug: string; name: string }[];
}

export default function ExpansionMenu({ onNavigate }: ExpansionMenuProps) {
  const navigate = useNavigate();
  const { instanceSlug, bossSlug } = useParams();
  const location = useLocation();

  const pathParts = location.pathname.replace(/^\//, '').split('/');
  const selectedKey = bossSlug && instanceSlug
    ? `${pathParts[0]}/${instanceSlug}/${bossSlug}`
    : instanceSlug
      ? `${pathParts[0]}/${instanceSlug}`
      : '';

  const isSeasonRoute = pathParts[0] === 'season';

  // Build instance lists
  const raids: NavInstance[] = (currentSeason?.raids ?? []).map((inst) => {
    const full = instanceBySlug.get(inst.slug);
    return {
      slug: inst.slug,
      name: inst.name,
      encounters: full?.encounters.map((e) => ({ slug: e.slug, name: e.name })) ?? [],
    };
  });

  const dungeons: NavInstance[] = (currentSeason?.dungeons ?? []).map((inst) => {
    const full = instanceBySlug.get(inst.slug);
    return {
      slug: inst.slug,
      name: inst.name,
      encounters: full?.encounters.map((e) => ({ slug: e.slug, name: e.name })) ?? [],
    };
  });

  // Track which categories and instances are expanded
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    raids: true,
    dungeons: true,
  });
  const [expandedInstances, setExpandedInstances] = useState<Record<string, boolean>>(() => {
    // Auto-expand the currently selected instance
    if (instanceSlug && isSeasonRoute) {
      return { [instanceSlug]: true };
    }
    return {};
  });

  const toggleCategory = (key: string) => {
    setExpandedCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleInstance = (slug: string) => {
    setExpandedInstances((prev) => ({ ...prev, [slug]: !prev[slug] }));
  };

  const go = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  if (!currentSeason) return null;

  const renderInstances = (instances: NavInstance[]) =>
    instances.map((inst) => {
      const instKey = `season/${inst.slug}`;
      const isExpanded = expandedInstances[inst.slug] ?? false;
      const isSelected = selectedKey === instKey;

      return (
        <div key={inst.slug}>
          <button
            onClick={() => {
              toggleInstance(inst.slug);
              go(`/${instKey}`);
            }}
            className={`w-full flex items-center gap-2 pl-7 pr-3 py-1.5 border-none cursor-pointer text-[13px] transition-all duration-150 rounded-md mx-0 ${
              isSelected
                ? 'bg-wow-bg-raised text-wow-gold font-medium'
                : 'bg-transparent text-wow-text-secondary hover:text-wow-text hover:bg-wow-bg-elevated'
            }`}
          >
            <RightOutlined
              className="text-[9px] transition-transform duration-200 flex-shrink-0"
              style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
            />
            <span className="truncate">{inst.name}</span>
          </button>

          {isExpanded && inst.encounters.length > 0 && (
            <div className="ml-4">
              {inst.encounters.map((enc) => {
                const encKey = `season/${inst.slug}/${enc.slug}`;
                const isEncSelected = selectedKey === encKey;

                return (
                  <button
                    key={enc.slug}
                    onClick={() => go(`/${encKey}`)}
                    className={`w-full text-left pl-8 pr-3 py-1 border-none cursor-pointer text-[12px] transition-all duration-150 rounded-md ${
                      isEncSelected
                        ? 'bg-wow-bg-raised text-wow-gold font-medium'
                        : 'bg-transparent text-wow-text-dim hover:text-wow-text-secondary hover:bg-wow-bg-elevated'
                    }`}
                  >
                    <span className="truncate block">{enc.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    });

  const renderCategory = (key: string, label: string, instances: NavInstance[]) => {
    if (instances.length === 0) return null;
    const isExpanded = expandedCategories[key] ?? false;

    return (
      <div key={key}>
        <button
          onClick={() => toggleCategory(key)}
          className="w-full flex items-center gap-2 px-4 py-1.5 border-none cursor-pointer bg-transparent text-wow-text-dim hover:text-wow-text-secondary text-[11px] font-semibold uppercase tracking-wider transition-colors duration-150"
        >
          <RightOutlined
            className="text-[8px] transition-transform duration-200"
            style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
          />
          {label}
        </button>
        {isExpanded && (
          <div className="pb-1">
            {renderInstances(instances)}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="flex-1 overflow-y-auto py-2">
      {/* Season header */}
      <div className="mx-3 mb-2 px-3 py-2.5 rounded-lg bg-wow-bg-elevated border border-wow-border">
        <button
          onClick={() => go('/season')}
          className="w-full flex items-center gap-2.5 border-none cursor-pointer bg-transparent p-0"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-wow-gold flex-shrink-0" />
          <span className="text-wow-gold font-semibold text-sm">{currentSeason.name}</span>
        </button>
      </div>

      {/* Nav tree */}
      <div className="px-1">
        {renderCategory('raids', 'Raids', raids)}
        {renderCategory('dungeons', 'Dungeons', dungeons)}
      </div>
    </nav>
  );
}
