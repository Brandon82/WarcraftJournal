import { ConfigProvider } from 'antd';
import { RouterProvider } from 'react-router';
import { darkTheme, lightTheme } from './theme';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { router } from './router';

function AppInner() {
  const { theme } = useTheme();
  return (
    <ConfigProvider theme={theme === 'dark' ? darkTheme : lightTheme}>
      <RouterProvider router={router} />
    </ConfigProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
