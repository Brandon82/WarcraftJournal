import { Breadcrumb } from 'antd';
import { Link, useParams, useLocation } from 'react-router';
import { HomeOutlined } from '@ant-design/icons';
import { useExpansion } from '../../hooks/useExpansion';
import { useInstance } from '../../hooks/useInstance';
import { useEncounter } from '../../hooks/useEncounter';
import { currentSeason } from '../../data/currentSeason';

export default function BreadcrumbNav() {
  const { expansionSlug, instanceSlug, bossSlug } = useParams();
  const isSeason = useLocation().pathname.startsWith('/season');
  const expansion = useExpansion(expansionSlug);
  const instance = useInstance(instanceSlug);
  const encounter = useEncounter(bossSlug);

  const items = [
    {
      title: (
        <Link to="/">
          <HomeOutlined />
        </Link>
      ),
    },
  ];

  if (isSeason) {
    items.push({
      title: <Link to="/season">{currentSeason?.name ?? 'Current Season'}</Link>,
    });
  } else if (expansion) {
    items.push({
      title: <Link to={`/${expansion.slug}`}>{expansion.name}</Link>,
    });
  }

  if (instance) {
    const instancePath = isSeason ? `/season/${instance.slug}` : `/${expansionSlug}/${instance.slug}`;
    items.push({
      title: <Link to={instancePath}>{instance.name}</Link>,
    });
  }

  if (encounter) {
    items.push({
      title: <span>{encounter.name}</span>,
    });
  }

  return <Breadcrumb items={items} />;
}
