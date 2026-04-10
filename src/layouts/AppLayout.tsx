import { useState } from 'react';
import { Outlet } from 'react-router';
import { BookOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import ExpansionMenu from '../components/navigation/ExpansionMenu';
import BreadcrumbNav from '../components/navigation/BreadcrumbNav';
import { JournalProvider } from '../context/JournalContext';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <JournalProvider>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside
          className="fixed inset-y-0 left-0 z-10 w-[280px] overflow-y-auto bg-wow-bg-base border-r border-wow-border"
          style={{
            transform: collapsed ? 'translateX(-100%)' : 'translateX(0)',
            transition: 'transform 200ms ease',
          }}
        >
          <div className="px-5 py-4 border-b border-wow-border flex items-center gap-2.5">
            <BookOutlined className="text-wow-gold text-xl" />
            <h4 className="text-wow-gold font-semibold text-lg m-0 whitespace-nowrap">
              WarcraftJournal
            </h4>
          </div>
          <ExpansionMenu />
        </aside>

        {/* Main content */}
        <div
          className="flex-1 flex flex-col"
          style={{
            marginLeft: collapsed ? 0 : 280,
            transition: 'margin-left 200ms ease',
          }}
        >
          <header className="sticky top-0 z-5 h-16 bg-wow-bg-elevated border-b border-wow-border flex items-center px-6 gap-4">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="bg-transparent border-none cursor-pointer text-wow-text-secondary text-lg p-0 flex items-center hover:text-wow-text transition-colors duration-150"
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
            <BreadcrumbNav />
          </header>

          <main className="flex-1 p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </JournalProvider>
  );
}
