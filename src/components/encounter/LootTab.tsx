import type { JournalItem } from '../../types';
import LootItemCard from '../loot/LootItemCard';

interface LootTabProps {
  items: JournalItem[];
}

export default function LootTab({ items }: LootTabProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-wow-text-secondary">
        No loot data available
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <LootItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}
