import { Link } from 'react-router';
import { expansions } from '../data';

export default function HomePage() {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-wow-gold mb-2 tracking-wide">
        Adventure Guide
      </h2>
      <p className="text-wow-text-secondary mb-8">
        Select an expansion to browse raids and dungeons.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {expansions.map((exp) => (
          <Link key={exp.id} to={`/${exp.slug}`} className="no-underline">
            <div className="bg-wow-bg-elevated border border-wow-border rounded-lg p-6 hover:border-wow-gold-muted hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              <h3 className="text-wow-gold text-lg font-medium m-0">
                {exp.name}
              </h3>
              <p className="text-wow-text-secondary text-sm mt-2 m-0">
                {exp.raids.length} {exp.raids.length === 1 ? 'Raid' : 'Raids'}
                {exp.dungeons.length > 0 &&
                  ` · ${exp.dungeons.length} ${exp.dungeons.length === 1 ? 'Dungeon' : 'Dungeons'}`}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
