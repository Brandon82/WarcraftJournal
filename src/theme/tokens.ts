import { theme } from 'antd';
import type { ThemeConfig } from 'antd';

const sharedTokens = {
  borderRadius: 10,
  fontFamily: '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
  colorSuccess: '#22c55e',
  colorWarning: '#f59e0b',
  colorError: '#ef4444',
  colorInfo: '#3b82f6',
};

export const darkTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    ...sharedTokens,
    colorPrimary: '#d4a843',
    colorBgBase: '#09090b',
    colorBgContainer: '#18181b',
    colorBgElevated: '#1c1c1f',
    colorBgLayout: '#09090b',
    colorText: '#fafafa',
    colorTextSecondary: '#a1a1aa',
    colorBorder: '#27272a',
    colorBorderSecondary: '#1c1c1f',
    colorLink: '#d4a843',
    colorLinkHover: '#e0b854',
  },
  components: {
    Menu: {},
    Tabs: {
      inkBarColor: '#d4a843',
      itemSelectedColor: '#d4a843',
      itemColor: '#a1a1aa',
    },
    Segmented: {
      itemSelectedBg: '#d4a843',
      itemSelectedColor: '#09090b',
    },
  },
};

export const lightTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    ...sharedTokens,
    colorPrimary: '#a07d2e',
    colorBgBase: '#fafafa',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgLayout: '#fafafa',
    colorText: '#09090b',
    colorTextSecondary: '#71717a',
    colorBorder: '#e4e4e7',
    colorBorderSecondary: '#f4f4f5',
    colorLink: '#a07d2e',
    colorLinkHover: '#8b6c28',
  },
  components: {
    Menu: {},
    Tabs: {
      inkBarColor: '#a07d2e',
      itemSelectedColor: '#a07d2e',
      itemColor: '#71717a',
    },
    Segmented: {
      itemSelectedBg: '#a07d2e',
      itemSelectedColor: '#ffffff',
    },
  },
};
