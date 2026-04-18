import { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router';
import { RightOutlined, NodeIndexOutlined, ToolOutlined, FileTextOutlined } from '@ant-design/icons';
import { currentSeason } from '../../data/currentSeason';

interface ExpansionMenuProps {
  onNavigate?: () => void;
}

interface NavInstance {
  slug: string;
  name: string;
}

export default function ExpansionMenu({ onNavigate }: ExpansionMenuProps) {
  const navigate = useNavigate();
  const { instanceSlug } = useParams();
  const location = useLocation();

  const pathParts = location.pathname.replace(/^\//, '').split('/');

  // Build instance lists
  const raids: NavInstance[] = (currentSeason?.raids ?? []).map((inst) => ({
    slug: inst.slug,
    name: inst.name,
  }));

  const dungeons: NavInstance[] = (currentSeason?.dungeons ?? []).map((inst) => ({
    slug: inst.slug,
    name: inst.name,
  }));

  // Track whether the season header is expanded
  const [seasonExpanded, setSeasonExpanded] = useState(true);
  // Track which sub-categories (raids/dungeons) are expanded
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    raids: true,
    dungeons: true,
  });

  const toggleCategory = (key: string) => {
    setExpandedCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const go = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  if (!currentSeason) return null;

  const isSeasonRoute = pathParts[0] === 'season';

  const renderInstances = (instances: NavInstance[]) =>
    instances.map((inst) => {
      const instKey = `season/${inst.slug}`;
      const isSelected = isSeasonRoute && instanceSlug === inst.slug;

      return (
        <button
          key={inst.slug}
          onClick={() => go(`/${instKey}`)}
          className={`w-full flex items-center gap-2 pl-7 pr-3 py-1.5 border-none cursor-pointer text-[13px] transition-all duration-150 rounded-md mx-0 ${
            isSelected
              ? 'bg-wow-bg-raised text-wow-gold font-medium'
              : 'bg-transparent text-wow-text-secondary hover:text-wow-text hover:bg-wow-bg-elevated'
          }`}
        >
          <span className="truncate">{inst.name}</span>
        </button>
      );
    });

  const renderGroup = (key: string, label: string, instances: NavInstance[]) => {
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
        {isExpanded && <div className="pb-1">{renderInstances(instances)}</div>}
      </div>
    );
  };

  return (
    <nav className="flex-1 overflow-y-auto py-2">
      {/* Season collapsible header */}
      <div className="px-1">
        <button
          onClick={() => setSeasonExpanded((prev) => !prev)}
          className="w-full flex items-center gap-2 px-3 py-2 border-none cursor-pointer bg-transparent text-wow-gold font-semibold text-sm transition-colors duration-150 hover:bg-wow-bg-elevated rounded-md"
        >
          <RightOutlined
            className="text-[10px] transition-transform duration-200"
            style={{ transform: seasonExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
          />
          <span className="truncate">{currentSeason.name}</span>
        </button>
        {seasonExpanded && (
          <div className="pb-1">
            {renderGroup('raids', 'Raids', raids)}
            {renderGroup('dungeons', 'Dungeons', dungeons)}
          </div>
        )}
        <div className="my-2 mx-3 border-t border-wow-border" />
        <button
          onClick={() => go('/tools/mdt-route')}
          className={`w-full flex items-center gap-2 pl-7 pr-3 py-1.5 border-none cursor-pointer text-[13px] transition-all duration-150 rounded-md mx-0 ${
            location.pathname === '/tools/mdt-route'
              ? 'bg-wow-bg-raised text-wow-gold font-medium'
              : 'bg-transparent text-wow-text-secondary hover:text-wow-text hover:bg-wow-bg-elevated'
          }`}
        >
          <NodeIndexOutlined className="text-[12px]" />
          <span className="truncate">M+ Routes</span>
        </button>
        <button
          onClick={() => go('/tools')}
          className={`w-full flex items-center gap-2 pl-7 pr-3 py-1.5 border-none cursor-pointer text-[13px] transition-all duration-150 rounded-md mx-0 ${
            location.pathname === '/tools'
              ? 'bg-wow-bg-raised text-wow-gold font-medium'
              : 'bg-transparent text-wow-text-secondary hover:text-wow-text hover:bg-wow-bg-elevated'
          }`}
        >
          <ToolOutlined className="text-[12px]" />
          <span className="truncate">Useful Tools</span>
        </button>
        <button
          onClick={() => go('/changelog')}
          className={`w-full flex items-center gap-2 pl-7 pr-3 py-1.5 border-none cursor-pointer text-[13px] transition-all duration-150 rounded-md mx-0 ${
            location.pathname === '/changelog'
              ? 'bg-wow-bg-raised text-wow-gold font-medium'
              : 'bg-transparent text-wow-text-secondary hover:text-wow-text hover:bg-wow-bg-elevated'
          }`}
        >
          <FileTextOutlined className="text-[12px]" />
          <span className="truncate">Changelog</span>
        </button>
      </div>
    </nav>
  );
}
