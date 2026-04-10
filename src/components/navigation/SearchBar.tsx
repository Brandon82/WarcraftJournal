import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { SearchOutlined } from '@ant-design/icons';
import { expansions, instances, encounters } from '../../data';
import { expansionById } from '../../data';

interface SearchBarProps {
  onClose: () => void;
}

interface SearchResult {
  type: 'expansion' | 'instance' | 'encounter';
  name: string;
  path: string;
  subtitle?: string;
}

export default function SearchBar({ onClose }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const matches: SearchResult[] = [];

    for (const exp of expansions) {
      if (exp.name.toLowerCase().includes(q)) {
        matches.push({ type: 'expansion', name: exp.name, path: `/${exp.slug}` });
      }
    }

    for (const inst of instances) {
      if (inst.name.toLowerCase().includes(q)) {
        const exp = expansionById.get(inst.expansionId);
        matches.push({
          type: 'instance',
          name: inst.name,
          path: `/${exp?.slug ?? ''}/${inst.slug}`,
          subtitle: `${inst.category === 'raid' ? 'Raid' : 'Dungeon'} · ${exp?.name ?? ''}`,
        });
      }
    }

    for (const enc of encounters) {
      if (enc.name.toLowerCase().includes(q)) {
        const inst = instances.find((i) => i.id === enc.instanceId);
        const exp = inst ? expansionById.get(inst.expansionId) : undefined;
        matches.push({
          type: 'encounter',
          name: enc.name,
          path: `/${exp?.slug ?? ''}/${enc.instanceSlug}/${enc.slug}`,
          subtitle: inst?.name,
        });
      }
    }

    return matches.slice(0, 20);
  }, [query]);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    setSelectedIndex(0);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      navigate(results[selectedIndex].path);
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const typeLabels: Record<string, string> = {
    expansion: 'Expansion',
    instance: 'Instance',
    encounter: 'Boss',
  };

  const typeColors: Record<string, string> = {
    expansion: 'text-wow-gold',
    instance: 'text-blue-400',
    encounter: 'text-orange-400',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Search panel */}
      <div className="relative w-full max-w-lg mx-4 bg-wow-bg-surface border border-wow-border rounded-xl overflow-hidden" style={{ boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)' }}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-wow-border">
          <SearchOutlined className="text-wow-text-dim" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search bosses, raids, dungeons..."
            className="flex-1 bg-transparent border-none outline-none text-wow-text text-sm placeholder:text-wow-text-dim"
          />
          <kbd className="text-[10px] text-wow-text-dim bg-wow-bg-raised px-1.5 py-0.5 rounded border border-wow-border">
            ESC
          </kbd>
        </div>

        {results.length > 0 && (
          <div className="max-h-[300px] overflow-y-auto py-2">
            {results.map((result, i) => (
              <button
                key={result.path}
                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 cursor-pointer border-none transition-colors duration-100 ${
                  i === selectedIndex ? 'bg-wow-bg-elevated' : 'bg-transparent'
                }`}
                onMouseEnter={() => setSelectedIndex(i)}
                onClick={() => {
                  navigate(result.path);
                  onClose();
                }}
              >
                <span className={`text-[10px] font-semibold uppercase tracking-wider w-16 shrink-0 ${typeColors[result.type]}`}>
                  {typeLabels[result.type]}
                </span>
                <div className="min-w-0">
                  <span className="text-wow-text text-sm block truncate">
                    {result.name}
                  </span>
                  {result.subtitle && (
                    <span className="text-wow-text-dim text-xs block truncate">
                      {result.subtitle}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {query && results.length === 0 && (
          <div className="py-8 text-center text-wow-text-dim text-sm">
            No results found
          </div>
        )}
      </div>
    </div>
  );
}
