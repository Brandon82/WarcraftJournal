import { ConfigProvider } from 'antd';
import { RouterProvider } from 'react-router';
import { warcraftTheme } from './theme';
import { router } from './router';

export default function App() {
  return (
    <ConfigProvider theme={warcraftTheme}>
      <RouterProvider router={router} />
    </ConfigProvider>
  );
}
