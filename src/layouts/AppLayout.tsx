import { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { Drawer } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, SunOutlined, MoonOutlined, SearchOutlined, CodeOutlined } from '@ant-design/icons';
import JournalIcon from '../components/JournalIcon';
import ExpansionMenu from '../components/navigation/ExpansionMenu';
import BreadcrumbNav from '../components/navigation/BreadcrumbNav';
import SearchBar from '../components/navigation/SearchBar';
import { JournalProvider } from '../context/JournalContext';
import { LayoutProvider, useLayout } from '../context/LayoutContext';
import { useTheme } from '../context/ThemeContext';
import { useDevMode } from '../context/DevModeContext';
import { useIsMobile } from '../hooks/useIsMobile';

export default function AppLayout() {
  return (
    <JournalProvider>
      <LayoutProvider>
        <AppLayoutInner />
      </LayoutProvider>
    </JournalProvider>
  );
}

function AppLayoutInner() {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { devMode, toggleDevMode } = useDevMode();
  const { wide, hideHeader } = useLayout();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();

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
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-wow-border flex items-center gap-2.5 rounded-t-2xl">
        <button
          onClick={() => { navigate('/'); handleNavigate(); }}
          className="flex items-center gap-2.5 bg-transparent border-none cursor-pointer p-0"
        >
          <JournalIcon className="text-wow-gold text-2xl" />
          <h4 className="text-wow-gold font-semibold text-lg m-0 whitespace-nowrap">
            WarcraftJournal
          </h4>
        </button>
        <div className="flex-1" />
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="bg-transparent border border-wow-border rounded-xl cursor-pointer text-wow-text-secondary text-sm p-2 flex items-center hover:text-wow-text hover:bg-wow-bg-elevated transition-all duration-150"
          >
            <MenuFoldOutlined />
          </button>
        )}
      </div>
      <ExpansionMenu onNavigate={handleNavigate} />
    </div>
  );

  return (
      <div className="flex min-h-screen bg-wow-bg-base transition-colors duration-200">
        {/* Desktop sidebar */}
        {!isMobile && (
          <aside
            className="fixed top-3 bottom-3 left-3 z-10 w-[270px] overflow-hidden bg-wow-bg-surface rounded-2xl transition-colors duration-200"
            style={{
              transform: collapsed ? 'translateX(calc(-100% - 12px))' : 'translateX(0)',
              transition: 'transform 200ms ease, background-color 200ms ease',
              boxShadow: '0 2px 16px 0 rgb(0 0 0 / 0.15)',
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
          className="flex-1 flex flex-col min-w-0"
          style={{
            marginLeft: isMobile ? 0 : collapsed ? 0 : 294,
            transition: 'margin-left 200ms ease',
          }}
        >
          <header
            className="sticky top-3 z-[1000] h-14 bg-wow-bg-surface rounded-2xl flex items-center mx-3 px-4 sm:px-6 gap-3 transition-colors duration-200"
            style={{
              boxShadow: '0 2px 16px 0 rgb(0 0 0 / 0.15)',
              visibility: hideHeader ? 'hidden' : 'visible',
            }}
          >
            {(isMobile || collapsed) && (
              <button
                onClick={() => isMobile ? setDrawerOpen(true) : setCollapsed(false)}
                className="bg-transparent border border-wow-border rounded-xl cursor-pointer text-wow-text-secondary text-sm p-2.5 sm:p-2 flex items-center hover:text-wow-text hover:bg-wow-bg-elevated transition-all duration-150"
              >
                <MenuUnfoldOutlined />
              </button>
            )}
            <div className="flex-1 min-w-0">
              <BreadcrumbNav />
            </div>
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
              className="bg-transparent border border-wow-border rounded-xl cursor-pointer text-wow-text-secondary text-sm p-2.5 sm:p-2 flex items-center hover:text-wow-text hover:bg-wow-bg-elevated transition-all duration-150 sm:hidden"
            >
              <SearchOutlined />
            </button>
            <button
              onClick={toggleDevMode}
              className={`bg-transparent border border-wow-border rounded-xl cursor-pointer text-sm p-2.5 sm:p-2 flex items-center hover:bg-wow-bg-elevated transition-all duration-150 ${
                devMode ? 'text-wow-gold border-wow-gold-muted' : 'text-wow-text-secondary hover:text-wow-text'
              }`}
              title={devMode ? 'Disable developer mode' : 'Enable developer mode'}
            >
              <CodeOutlined />
            </button>
            <button
              onClick={toggleTheme}
              className="bg-transparent border border-wow-border rounded-xl cursor-pointer text-wow-text-secondary text-sm p-2.5 sm:p-2 flex items-center hover:text-wow-text hover:bg-wow-bg-elevated transition-all duration-150"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <SunOutlined /> : <MoonOutlined />}
            </button>
          </header>

          <main
            className={
              // Pages opt into a wider container by calling setWide(true)
              // through LayoutContext (e.g. the MDT route editor while a
              // route is loaded). Defaults to the centered narrow layout
              // that suits long-form reading.
              wide
                ? 'flex-1 py-4 px-3 sm:py-6 sm:px-6 lg:px-8'
                : 'flex-1 py-4 px-3 sm:py-8 sm:px-16 lg:px-24 xl:px-32'
            }
          >
            <div className={wide ? 'max-w-[1300px] mx-auto' : 'max-w-6xl mx-auto'}>
              <div key={location.pathname} className="page-enter">
                <Outlet />
              </div>
            </div>
          </main>
        </div>

        {/* Search overlay */}
        {searchOpen && <SearchBar onClose={() => setSearchOpen(false)} />}
      </div>
  );
}
