import { theme } from 'antd';
import type { ThemeConfig } from 'antd';

export const warcraftTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#c79c6e',
    colorBgBase: '#1a1a2e',
    colorBgContainer: '#16213e',
    colorBgElevated: '#1e2a4a',
    colorBgLayout: '#0f0f1a',
    colorText: '#e0d8c8',
    colorTextSecondary: '#a09882',
    colorBorder: '#2a2a4a',
    colorBorderSecondary: '#1e1e3a',
    colorLink: '#ffd100',
    colorLinkHover: '#ffe44d',
    borderRadius: 4,
    fontFamily: '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
    colorSuccess: '#1eff00',
    colorWarning: '#ff8000',
    colorError: '#ff3333',
    colorInfo: '#0070dd',
  },
  components: {
    Menu: {
      darkItemBg: '#0f0f1a',
      darkSubMenuItemBg: '#0a0a15',
      darkItemSelectedBg: '#2a2a4a',
      darkItemColor: '#a09882',
      darkItemSelectedColor: '#ffd100',
    },
    Tabs: {
      inkBarColor: '#c79c6e',
      itemSelectedColor: '#ffd100',
      itemColor: '#a09882',
    },
    Segmented: {
      itemSelectedBg: '#c79c6e',
      itemSelectedColor: '#0f0f1a',
    },
  },
};
