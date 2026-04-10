import type { JournalItem, ItemQuality } from '../../types';
import { ITEM_QUALITY_COLORS } from '../../types';

interface LootItemCardProps {
  item: JournalItem;
}

const QUALITY_LABELS: Record<ItemQuality, string> = {
  POOR: 'Poor',
  COMMON: 'Common',
  UNCOMMON: 'Uncommon',
  RARE: 'Rare',
  EPIC: 'Epic',
  LEGENDARY: 'Legendary',
};

export default function LootItemCard({ item }: LootItemCardProps) {
  const qualityColor = ITEM_QUALITY_COLORS[item.quality] ?? '#ffffff';

  return (
    <a
      href={`https://www.wowhead.com/item=${item.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="no-underline block"
    >
      <div
        className="bg-wow-bg-surface border border-wow-border rounded-xl p-3 hover:border-wow-gold-muted/50 transition-all duration-150 cursor-pointer group"
        style={{ borderLeftWidth: '3px', borderLeftColor: qualityColor }}
      >
        <div className="flex items-center gap-3">
          {item.iconUrl ? (
            <img
              src={item.iconUrl}
              alt={item.name}
              className="w-10 h-10 rounded-lg object-cover shrink-0 transition-transform duration-200 group-hover:scale-105"
              style={{ border: `1px solid ${qualityColor}` }}
            />
          ) : (
            <div
              className="w-10 h-10 rounded-lg bg-wow-bg-elevated flex items-center justify-center font-bold text-sm shrink-0"
              style={{ color: qualityColor, border: `1px solid ${qualityColor}` }}
            >
              {item.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <span
              className="font-semibold text-sm block truncate group-hover:brightness-125 transition-[filter] duration-150"
              style={{ color: qualityColor }}
            >
              {item.name}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-wow-text-dim text-xs">
                {QUALITY_LABELS[item.quality]}
              </span>
              {item.itemLevel && (
                <>
                  <span className="text-wow-text-dim text-xs">·</span>
                  <span className="text-wow-text-secondary text-xs font-medium">
                    iLvl {item.itemLevel}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </a>
  );
}
