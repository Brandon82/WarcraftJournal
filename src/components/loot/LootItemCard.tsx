import type { JournalItem } from '../../types';
import { ITEM_QUALITY_COLORS } from '../../types';

interface LootItemCardProps {
  item: JournalItem;
}

export default function LootItemCard({ item }: LootItemCardProps) {
  const qualityColor = ITEM_QUALITY_COLORS[item.quality] ?? '#ffffff';

  return (
    <div
      className="bg-wow-bg-elevated border border-wow-border rounded-lg p-3 hover:border-wow-gold-muted/50 transition-colors duration-150"
      style={{ borderLeftWidth: '3px', borderLeftColor: qualityColor }}
    >
      <div className="flex items-center gap-3">
        {item.iconUrl ? (
          <img
            src={item.iconUrl}
            alt={item.name}
            className="w-10 h-10 rounded object-cover"
            style={{ border: `1px solid ${qualityColor}` }}
          />
        ) : (
          <div
            className="w-10 h-10 rounded bg-wow-border flex items-center justify-center font-bold text-sm"
            style={{ color: qualityColor, border: `1px solid ${qualityColor}` }}
          >
            {item.name.charAt(0)}
          </div>
        )}
        <div>
          <span
            className="font-semibold text-sm block"
            style={{ color: qualityColor }}
          >
            {item.name}
          </span>
          {item.itemLevel && (
            <span className="text-wow-text-secondary text-xs">
              Item Level {item.itemLevel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
