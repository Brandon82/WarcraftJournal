import { useParams, Link } from 'react-router';
import { useInstance } from '../hooks/useInstance';

export default function InstancePage() {
  const { expansionSlug, instanceSlug } = useParams();
  const instance = useInstance(instanceSlug);

  if (!instance) {
    return (
      <div className="text-center py-16 text-wow-text-secondary">
        Instance not found
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <span
          className={`inline-block px-3 py-1 rounded-md text-xs font-medium uppercase tracking-wider border ${
            instance.category === 'raid'
              ? 'bg-wow-bg-raised text-orange-400 border-orange-400/30'
              : 'bg-wow-bg-raised text-blue-400 border-blue-400/30'
          }`}
        >
          {instance.category === 'raid' ? 'Raid' : 'Dungeon'}
        </span>
        <h2 className="text-2xl font-semibold text-wow-gold mt-3 mb-2 tracking-wide">
          {instance.name}
        </h2>
        {instance.description && (
          <p className="text-wow-text-secondary leading-relaxed max-w-[700px] m-0">
            {instance.description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {instance.encounters.map((enc, index) => (
          <Link key={enc.id} to={`/${expansionSlug}/${instanceSlug}/${enc.slug}`} className="no-underline">
            <div className="bg-wow-bg-elevated border border-wow-border rounded-lg p-6 text-center hover:border-wow-gold-muted hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-wow-border to-wow-bg-raised border-2 border-wow-gold-muted flex items-center justify-center mx-auto mb-4 text-2xl text-wow-gold-muted font-bold">
                {index + 1}
              </div>
              <span className="text-wow-text text-sm block">
                {enc.name}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
