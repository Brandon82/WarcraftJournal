import { createBrowserRouter } from 'react-router';
import AppLayout from './layouts/AppLayout';
import HomePage from './pages/HomePage';
import ExpansionPage from './pages/ExpansionPage';
import InstancePage from './pages/InstancePage';
import EncounterPage from './pages/EncounterPage';
import NotFoundPage from './pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: ':expansionSlug', element: <ExpansionPage /> },
      { path: ':expansionSlug/:instanceSlug', element: <InstancePage /> },
      { path: ':expansionSlug/:instanceSlug/:bossSlug', element: <EncounterPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
