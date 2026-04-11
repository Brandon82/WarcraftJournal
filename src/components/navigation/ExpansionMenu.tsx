import { Menu } from 'antd';
import { useNavigate, useParams, useLocation } from 'react-router';
import { instanceBySlug } from '../../data';
import { currentSeason } from '../../data/currentSeason';
import { useTheme } from '../../context/ThemeContext';
import type { MenuProps } from 'antd';

type MenuItem = Required<MenuProps>['items'][number];

interface ExpansionMenuProps {
  onNavigate?: () => void;
}

export default function ExpansionMenu({ onNavigate }: ExpansionMenuProps) {
  const navigate = useNavigate();
  const { instanceSlug, bossSlug } = useParams();
  const location = useLocation();
  const { theme } = useTheme();

  const items: MenuItem[] = [];

  if (currentSeason) {
    const seasonChildren: MenuItem[] = [];

    if (currentSeason.raids.length > 0) {
      seasonChildren.push({
        key: 'raids',
        label: 'Raids',
        children: currentSeason.raids.map((inst) => {
          const full = instanceBySlug.get(inst.slug);
          return {
            key: `season/${inst.slug}`,
            label: inst.name,
            children: full?.encounters.map((enc) => ({
              key: `season/${inst.slug}/${enc.slug}`,
              label: enc.name,
            })),
          };
        }),
      });
    }

    if (currentSeason.dungeons.length > 0) {
      seasonChildren.push({
        key: 'dungeons',
        label: 'Dungeons',
        children: currentSeason.dungeons.map((inst) => {
          const full = instanceBySlug.get(inst.slug);
          return {
            key: `season/${inst.slug}`,
            label: inst.name,
            children: full?.encounters.map((enc) => ({
              key: `season/${inst.slug}/${enc.slug}`,
              label: enc.name,
            })),
          };
        }),
      });
    }

    items.push({
      key: 'season',
      label: currentSeason.name,
      children: seasonChildren,
    });
  }

  // Determine selected key from current path
  const pathParts = location.pathname.replace(/^\//, '').split('/');
  const selectedKey = bossSlug && instanceSlug
    ? `${pathParts[0]}/${instanceSlug}/${bossSlug}`
    : instanceSlug
      ? `${pathParts[0]}/${instanceSlug}`
      : '';

  const handleClick: MenuProps['onClick'] = (info) => {
    navigate(`/${info.key}`);
    onNavigate?.();
  };

  return (
    <Menu
      mode="inline"
      theme={theme === 'dark' ? 'dark' : 'light'}
      items={items}
      selectedKeys={[selectedKey]}
      defaultOpenKeys={['season']}
      onClick={handleClick}
      style={{ borderRight: 'none' }}
    />
  );
}
