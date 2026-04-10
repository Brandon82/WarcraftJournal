import { Breadcrumb } from 'antd';
import { Link, useParams } from 'react-router';
import { HomeOutlined } from '@ant-design/icons';
import { useExpansion } from '../../hooks/useExpansion';
import { useInstance } from '../../hooks/useInstance';
import { useEncounter } from '../../hooks/useEncounter';

export default function BreadcrumbNav() {
  const { expansionSlug, instanceSlug, bossSlug } = useParams();
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

  if (expansion) {
    items.push({
      title: <Link to={`/${expansion.slug}`}>{expansion.name}</Link>,
    });
  }

  if (instance) {
    items.push({
      title: (
        <Link to={`/${expansionSlug}/${instance.slug}`}>{instance.name}</Link>
      ),
    });
  }

  if (encounter) {
    items.push({
      title: <span>{encounter.name}</span>,
    });
  }

  return <Breadcrumb items={items} />;
}
