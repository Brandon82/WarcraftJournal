import { createBrowserRouter } from 'react-router';
import AppLayout from './layouts/AppLayout';
import HomePage from './pages/HomePage';
import ExpansionPage from './pages/ExpansionPage';
import InstancePage from './pages/InstancePage';
import EncounterPage from './pages/EncounterPage';
import NotFoundPage from './pages/NotFoundPage';
import SeasonPage from './pages/SeasonPage';
import ToolsPage from './pages/ToolsPage';
import MdtRoutePage from './pages/MdtRoutePage';
import ChangelogPage from './pages/ChangelogPage';

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
      { path: 'tools/mdt-route', element: <MdtRoutePage /> },
      { path: 'changelog', element: <ChangelogPage /> },
      { path: ':expansionSlug', element: <ExpansionPage /> },
      { path: ':expansionSlug/:instanceSlug', element: <InstancePage /> },
      { path: ':expansionSlug/:instanceSlug/:bossSlug', element: <EncounterPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
