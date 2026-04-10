import { InboxOutlined } from '@ant-design/icons';
import type { JournalItem } from '../../types';
import LootItemCard from '../loot/LootItemCard';

interface LootTabProps {
  items: JournalItem[];
}

export default function LootTab({ items }: LootTabProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <InboxOutlined className="text-3xl text-wow-text-dim/40 mb-3" />
        <p className="text-wow-text-secondary text-sm m-0">
          No loot data available for this encounter
        </p>
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
