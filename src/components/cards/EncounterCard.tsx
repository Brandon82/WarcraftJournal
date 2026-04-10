import { Link } from 'react-router';
import { useState } from 'react';
import type { JournalEncounterRef, JournalEncounter } from '../../types';
import { encounterBySlug } from '../../data';

interface EncounterCardProps {
  encounterRef: JournalEncounterRef;
  index: number;
  expansionSlug: string;
  instanceSlug: string;
}

export default function EncounterCard({
  encounterRef,
  index,
  expansionSlug,
  instanceSlug,
}: EncounterCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const encounter = encounterBySlug.get(encounterRef.slug) as JournalEncounter | undefined;
  const creatureImage = encounter?.creatures[0]?.creatureDisplayMedia;

  return (
    <Link
      to={`/${expansionSlug}/${instanceSlug}/${encounterRef.slug}`}
      className="no-underline block group"
    >
      <div
        className="relative overflow-hidden rounded-xl border border-wow-border hover:border-wow-gold-muted transition-all duration-300 cursor-pointer"
        style={{ boxShadow: 'var(--wow-card-shadow)' }}
      >
        {/* Portrait */}
        <div className="relative aspect-[4/3] bg-wow-bg-raised overflow-hidden">
          {creatureImage && (
            <>
              {!imgLoaded && (
                <div className="absolute inset-0 bg-wow-bg-raised animate-pulse" />
              )}
              <img
                src={creatureImage}
                alt=""
                className={`w-full h-full object-cover object-top transition-all duration-500 group-hover:scale-105 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImgLoaded(true)}
              />
            </>
          )}
          {!creatureImage && (
            <div className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-wow-gold-muted/30">
              {encounterRef.name.charAt(0)}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

          {/* Boss number badge */}
          <span className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/60 border border-wow-gold-muted/50 text-wow-gold-muted text-xs font-bold flex items-center justify-center">
            {index + 1}
          </span>
        </div>

        {/* Name */}
        <div className="p-3 bg-wow-bg-surface">
          <span className="text-wow-text text-sm font-medium block truncate">
            {encounterRef.name}
          </span>
        </div>
      </div>
    </Link>
  );
}
