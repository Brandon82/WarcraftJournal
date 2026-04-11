import { createBrowserRouter } from 'react-router';
import AppLayout from './layouts/AppLayout';
import HomePage from './pages/HomePage';
import ExpansionPage from './pages/ExpansionPage';
import InstancePage from './pages/InstancePage';
import EncounterPage from './pages/EncounterPage';
import NotFoundPage from './pages/NotFoundPage';
import SeasonPage from './pages/SeasonPage';
import ToolsPage from './pages/ToolsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'season', element: <SeasonPage /> },
      { path: 'season/:instanceSlug', element: <InstancePage /> },
      { path: 'season/:instanceSlug/:bossSlug', element: <EncounterPage /> },
      { path: 'tools', element: <ToolsPage /> },
      { path: ':expansionSlug', element: <ExpansionPage /> },
      { path: ':expansionSlug/:instanceSlug', element: <InstancePage /> },
      { path: ':expansionSlug/:instanceSlug/:bossSlug', element: <EncounterPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
