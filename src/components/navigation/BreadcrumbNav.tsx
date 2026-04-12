import { Link, useParams, useLocation } from 'react-router';
import { HomeOutlined } from '@ant-design/icons';
import { useExpansion } from '../../hooks/useExpansion';
import { useInstance } from '../../hooks/useInstance';
import { useEncounter } from '../../hooks/useEncounter';
import { currentSeason } from '../../data/currentSeason';

const CRUMB_LINK = 'text-wow-text-dim hover:text-wow-text transition-colors truncate block';
const CRUMB_TEXT = 'text-wow-text-secondary truncate block';

export default function BreadcrumbNav() {
  const { expansionSlug, instanceSlug, bossSlug } = useParams();
  const isSeason = useLocation().pathname.startsWith('/season');
  const expansion = useExpansion(expansionSlug);
  const instance = useInstance(instanceSlug);
  const encounter = useEncounter(bossSlug);

  const crumbs: { key: string; node: React.ReactNode; hiddenOnDeep?: boolean }[] = [
    {
      key: 'home',
      node: (
        <Link to="/" className="text-wow-text-dim hover:text-wow-text transition-colors">
          <HomeOutlined />
        </Link>
      ),
    },
  ];

  if (isSeason) {
    crumbs.push({
      key: 'season',
      hiddenOnDeep: true,
      node: (
        <Link to="/season" className={CRUMB_LINK}>
          {currentSeason?.name ?? 'Current Season'}
        </Link>
      ),
    });
  } else if (expansion) {
    crumbs.push({
      key: 'expansion',
      hiddenOnDeep: true,
      node: (
        <Link to={`/${expansion.slug}`} className={CRUMB_LINK}>
          {expansion.name}
        </Link>
      ),
    });
  }

  if (instance) {
    const instancePath = isSeason ? `/season/${instance.slug}` : `/${expansionSlug}/${instance.slug}`;
    crumbs.push({
      key: 'instance',
      node: (
        <Link to={instancePath} className={CRUMB_LINK}>
          {instance.name}
        </Link>
      ),
    });
  }

  if (encounter) {
    crumbs.push({
      key: 'encounter',
      node: <span className={CRUMB_TEXT}>{encounter.name}</span>,
    });
  }

  // When we have 4+ crumbs (home + season/expansion + instance + boss),
  // hide the season/expansion on mobile to save space
  const isDeep = crumbs.length >= 4;

  return (
    <nav className="min-w-0 overflow-hidden">
      <ol className="flex items-center gap-1 list-none m-0 p-0 text-sm flex-nowrap">
        {crumbs.map((crumb, i) => (
          <li
            key={crumb.key}
            className={`flex items-center gap-1 shrink min-w-0 ${
              isDeep && crumb.hiddenOnDeep ? 'hidden sm:flex' : 'flex'
            }`}
          >
            {i > 0 && <span className="text-wow-text-dim shrink-0">/</span>}
            {crumb.node}
          </li>
        ))}
      </ol>
    </nav>
  );
}
