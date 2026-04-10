import { Menu } from 'antd';
import { useNavigate, useParams } from 'react-router';
import { expansions, instanceBySlug } from '../../data';
import type { MenuProps } from 'antd';

type MenuItem = Required<MenuProps>['items'][number];

export default function ExpansionMenu() {
  const navigate = useNavigate();
  const { expansionSlug, instanceSlug, bossSlug } = useParams();

  const items: MenuItem[] = expansions.map((exp) => ({
    key: exp.slug,
    label: exp.name,
    children: [
      ...(exp.raids.length > 0
        ? [
            {
              key: `${exp.slug}-raids`,
              label: 'Raids',
              type: 'group' as const,
              children: exp.raids.map((r) => {
                const instance = instanceBySlug.get(r.slug);
                return {
                  key: `${exp.slug}/${r.slug}`,
                  label: r.name,
                  children: instance?.encounters.map((enc) => ({
                    key: `${exp.slug}/${r.slug}/${enc.slug}`,
                    label: enc.name,
                  })),
                };
              }),
            },
          ]
        : []),
      ...(exp.dungeons.length > 0
        ? [
            {
              key: `${exp.slug}-dungeons`,
              label: 'Dungeons',
              type: 'group' as const,
              children: exp.dungeons.map((d) => {
                const instance = instanceBySlug.get(d.slug);
                return {
                  key: `${exp.slug}/${d.slug}`,
                  label: d.name,
                  children: instance?.encounters.map((enc) => ({
                    key: `${exp.slug}/${d.slug}/${enc.slug}`,
                    label: enc.name,
                  })),
                };
              }),
            },
          ]
        : []),
    ],
  }));

  const selectedKey = bossSlug
    ? `${expansionSlug}/${instanceSlug}/${bossSlug}`
    : instanceSlug
      ? `${expansionSlug}/${instanceSlug}`
      : expansionSlug ?? '';

  const handleClick: MenuProps['onClick'] = (info) => {
    navigate(`/${info.key}`);
  };

  return (
    <Menu
      mode="inline"
      theme="dark"
      items={items}
      selectedKeys={[selectedKey]}
      defaultOpenKeys={expansionSlug ? [expansionSlug] : []}
      onClick={handleClick}
      style={{ borderRight: 'none' }}
    />
  );
}
