import { useParams } from 'react-router';
import { useExpansion } from '../hooks/useExpansion';
import { instanceBySlug } from '../data';
import InstanceCard from '../components/cards/InstanceCard';

export default function ExpansionPage() {
  const { expansionSlug } = useParams();
  const expansion = useExpansion(expansionSlug);

  if (!expansion) {
    return (
      <div className="text-center py-16 text-wow-text-secondary">
        Expansion not found
      </div>
    );
  }

  const renderInstanceCards = (refs: typeof expansion.raids, category: string) => (
    <>
      <div className="flex items-center gap-4 my-8">
        <div className="flex-1 h-px bg-wow-border" />
        <span className="text-wow-gold-muted text-base font-medium tracking-wide">
          {category}
        </span>
        <div className="flex-1 h-px bg-wow-border" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {refs.map((ref) => {
          const instance = instanceBySlug.get(ref.slug);
          if (!instance) return null;
          return (
            <InstanceCard key={ref.id} instance={instance} />
          );
        })}
      </div>
    </>
  );

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-semibold text-wow-gold mb-2 tracking-wide">
        {expansion.name}
      </h2>
      {expansion.raids.length > 0 && renderInstanceCards(expansion.raids, 'Raids')}
      {expansion.dungeons.length > 0 && renderInstanceCards(expansion.dungeons, 'Dungeons')}
    </div>
  );
}
