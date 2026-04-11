import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { Outlet } from 'react-router';
import { Drawer } from 'antd';
import { BookOutlined, MenuFoldOutlined, MenuUnfoldOutlined, SunOutlined, MoonOutlined, SearchOutlined } from '@ant-design/icons';
import ExpansionMenu from '../components/navigation/ExpansionMenu';
import BreadcrumbNav from '../components/navigation/BreadcrumbNav';
import SearchBar from '../components/navigation/SearchBar';
import { JournalProvider } from '../context/JournalContext';
import { useTheme } from '../context/ThemeContext';

const mql = window.matchMedia('(max-width: 768px)');
function subscribeMql(cb: () => void) {
  mql.addEventListener('change', cb);
  return () => mql.removeEventListener('change', cb);
}
function getIsMobile() {
  return mql.matches;
}

function useIsMobile() {
  return useSyncExternalStore(subscribeMql, getIsMobile);
}

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();

  const handleNavigate = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  // Keyboard shortcut: Ctrl/Cmd+K to toggle search
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setSearchOpen((prev) => !prev);
    }
    if (e.key === 'Escape') {
      setSearchOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const sidebarContent = (
    <>
      <div className="px-5 py-4 border-b border-wow-border flex items-center gap-2.5">
        <BookOutlined className="text-wow-gold text-xl" />
        <h4 className="text-wow-gold font-semibold text-lg m-0 whitespace-nowrap">
          WarcraftJournal
        </h4>
      </div>
      <ExpansionMenu onNavigate={handleNavigate} />
    </>
  );

  return (
    <JournalProvider>
      <div className="flex min-h-screen bg-wow-bg-base transition-colors duration-200">
        {/* Desktop sidebar */}
        {!isMobile && (
          <aside
            className="fixed inset-y-0 left-0 z-10 w-[280px] overflow-y-auto bg-wow-bg-surface border-r border-wow-border transition-colors duration-200"
            style={{
              transform: collapsed ? 'translateX(-100%)' : 'translateX(0)',
              transition: 'transform 200ms ease, background-color 200ms ease',
            }}
          >
            {sidebarContent}
          </aside>
        )}

        {/* Mobile drawer */}
        {isMobile && (
          <Drawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            placement="left"
            styles={{
              wrapper: { width: 280 },
              body: { padding: 0, backgroundColor: 'var(--color-wow-bg-surface)' },
              header: { display: 'none' },
            }}
          >
            {sidebarContent}
          </Drawer>
        )}

        {/* Main content */}
        <div
          className="flex-1 flex flex-col"
          style={{
            marginLeft: isMobile ? 0 : collapsed ? 0 : 280,
            transition: 'margin-left 200ms ease',
          }}
        >
          <header className="sticky top-0 z-5 h-14 bg-wow-bg-surface border-b border-wow-border flex items-center px-4 sm:px-6 gap-3 transition-colors duration-200">
            <button
              onClick={() => isMobile ? setDrawerOpen(true) : setCollapsed(!collapsed)}
              className="bg-transparent border-none cursor-pointer text-wow-text-secondary text-lg p-0 flex items-center hover:text-wow-text transition-colors duration-150"
            >
              {isMobile ? <MenuUnfoldOutlined /> : collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
            <BreadcrumbNav />
            <div className="flex-1" />
            <button
              onClick={() => setSearchOpen(true)}
              className="bg-transparent border border-wow-border rounded-lg cursor-pointer text-wow-text-dim text-sm px-3 py-1.5 flex items-center gap-2 hover:text-wow-text hover:bg-wow-bg-elevated transition-all duration-150 hidden sm:flex"
            >
              <SearchOutlined />
              <span>Search</span>
              <kbd className="text-[10px] text-wow-text-dim bg-wow-bg-raised px-1.5 py-0.5 rounded border border-wow-border ml-2">
                {navigator.platform.includes('Mac') ? '\u2318' : 'Ctrl'}K
              </kbd>
            </button>
            <button
              onClick={() => setSearchOpen(true)}
              className="bg-transparent border border-wow-border rounded-xl cursor-pointer text-wow-text-secondary text-sm p-2 flex items-center hover:text-wow-text hover:bg-wow-bg-elevated transition-all duration-150 sm:hidden"
            >
              <SearchOutlined />
            </button>
            <button
              onClick={toggleTheme}
              className="bg-transparent border border-wow-border rounded-xl cursor-pointer text-wow-text-secondary text-sm p-2 flex items-center hover:text-wow-text hover:bg-wow-bg-elevated transition-all duration-150"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <SunOutlined /> : <MoonOutlined />}
            </button>
          </header>

          <main className="flex-1 py-4 px-6 sm:py-8 sm:px-16 lg:px-24 xl:px-32">
            <div className="max-w-6xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>

        {/* Search overlay */}
        {searchOpen && <SearchBar onClose={() => setSearchOpen(false)} />}
      </div>
    </JournalProvider>
  );
}
