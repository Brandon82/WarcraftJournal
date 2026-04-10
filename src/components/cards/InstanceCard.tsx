import { Link } from 'react-router';
import { useState } from 'react';
import type { JournalInstance } from '../../types';
import { expansionById } from '../../data';

interface InstanceCardProps {
  instance: JournalInstance;
  fallbackExpansionSlug?: string;
  linkPrefix?: string;
}

export default function InstanceCard({ instance, fallbackExpansionSlug, linkPrefix }: InstanceCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const expansion = expansionById.get(instance.expansionId);
  const expansionSlug = expansion?.slug ?? fallbackExpansionSlug ?? '';
  const hasImage = !!instance.backgroundImage;
  const href = linkPrefix ? `${linkPrefix}/${instance.slug}` : `/${expansionSlug}/${instance.slug}`;

  return (
    <Link to={href} className="no-underline block group">
      <div
        className="relative overflow-hidden rounded-xl border border-wow-border hover:border-wow-gold-muted transition-all duration-300 cursor-pointer"
        style={{
          boxShadow: 'var(--wow-card-shadow)',
          aspectRatio: hasImage ? '16 / 9' : undefined,
        }}
      >
        {hasImage && (
          <>
            {!imgLoaded && (
              <div className="absolute inset-0 bg-wow-bg-raised animate-pulse" />
            )}
            <img
              src={instance.backgroundImage}
              alt=""
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImgLoaded(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          </>
        )}

        <div className={`relative ${hasImage ? 'flex flex-col justify-end h-full p-4' : 'bg-wow-bg-surface p-5'}`}>
          <span
            className={`inline-block self-start px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider mb-2 ${
              instance.category === 'raid'
                ? 'bg-orange-500/20 text-orange-400'
                : 'bg-blue-500/20 text-blue-400'
            }`}
          >
            {instance.category === 'raid' ? 'Raid' : 'Dungeon'}
          </span>
          <h4 className={`text-sm font-semibold m-0 ${hasImage ? 'text-white' : 'text-wow-text'}`}>
            {instance.name}
          </h4>
          <p className={`text-xs mt-1 m-0 ${hasImage ? 'text-zinc-300' : 'text-wow-text-secondary'}`}>
            {instance.encounters.length} {instance.encounters.length === 1 ? 'Boss' : 'Bosses'}
          </p>
        </div>
      </div>
    </Link>
  );
}
