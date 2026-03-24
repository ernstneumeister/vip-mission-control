import { useState, useEffect, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', disabled: true },
  { icon: Bot, label: 'Agents', path: '/agents', disabled: true },
  { icon: Radio, label: 'Activity', path: '/activity', disabled: true },
  { icon: CheckSquare, label: 'Tasks', path: '/tasks', disabled: false },
  { icon: FileText, label: 'Docs', path: '/docs', disabled: false },
  { icon: Key, label: 'Env Vars', path: '/env', disabled: false },
  { icon: Zap, label: 'Skills', path: '/skills', disabled: true },
  { icon: BarChart, label: 'Usage', path: '/usage', disabled: true },
];

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const [version, setVersion] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const [userSettings, setUserSettings] = useState(() => {
    try {
      const stored = localStorage.getItem('mc-user-settings');
      return stored ? JSON.parse(stored) : { name: 'Admin', title: 'Administrator', avatarUrl: '', emoji: '🎯' };
    } catch {
      return { name: 'Admin', title: 'Administrator', avatarUrl: '', emoji: '🎯' };
    }
  });

  // Listen for settings changes (from Settings page)
  useEffect(() => {
    const handler = () => {
      try {
        const stored = localStorage.getItem('mc-user-settings');
        if (stored) setUserSettings(JSON.parse(stored));
      } catch {}
    };
    window.addEventListener('storage', handler);
    window.addEventListener('mc-settings-updated', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('mc-settings-updated', handler);
    };
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
  };

  // Set favicon from emoji on load
  useEffect(() => {
    const emoji = userSettings.emoji || '🎯';
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = '52px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, 32, 36);
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link');
      link.type = 'image/png';
      link.rel = 'icon';
      link.href = canvas.toDataURL();
      document.head.appendChild(link);
    }
  }, [userSettings.emoji]);

  useEffect(() => {
    fetch('/api/version')
      .then(r => r.json())
      .then(d => {
        setVersion(d.version || null);
        setUpdateAvailable(d.updateAvailable || false);
      })
      .catch(() => {});
  }, []);

  // On mobile, always show expanded (ignore collapsed state)
  const isCollapsed = mobileOpen ? false : collapsed;

  const sidebarContent = (
    <>
      {/* Header */}
      <div className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'} h-[50px] border-b border-border/30`}>
        {!isCollapsed && (
          <Link to="/" className="text-[16px] font-bold text-foreground no-underline flex items-center gap-1.5">
            {userSettings.emoji || '🎯'} <span>Mission Control</span>
          </Link>
        )}
        {/* Close button on mobile, collapse toggle on desktop */}
        <button
          onClick={() => {
            if (window.innerWidth < 768) {
              setMobileOpen(false);
            } else {
              toggleCollapsed();
            }
          }}
          className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-sidebar-accent"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = item.icon;
          if (item.disabled) {
            return (
              <div
                key={item.label}
                className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg text-[14px] font-medium text-muted-foreground cursor-not-allowed select-none`}
                title={isCollapsed ? item.label : undefined}
              >
                <span className="opacity-40 flex-shrink-0"><Icon size={18} /></span>
                {!isCollapsed && <span>{item.label}</span>}
              </div>
            );
          }
          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg text-[14px] font-medium no-underline transition-colors ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <span className="flex-shrink-0"><Icon size={18} /></span>
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom user section */}
      <div className="border-t border-border/30 px-3 py-3">
        {isCollapsed ? (
          <>
            <div className="flex justify-center py-1.5">
              {userSettings.avatarUrl ? (
                <img src={userSettings.avatarUrl} alt={userSettings.name} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[16px]">🏄</div>
              )}
            </div>
            <Link to="/settings" className="flex justify-center py-1.5 mt-1 text-muted-foreground hover:text-foreground transition-colors no-underline" title="Settings">
              <Settings size={16} />
            </Link>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 px-2 py-1.5">
              {userSettings.avatarUrl ? (
                <img src={userSettings.avatarUrl} alt={userSettings.name} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[16px]">🏄</div>
              )}
              <div>
                <div className="text-[13px] font-semibold text-foreground">{userSettings.name}</div>
                <div className="text-[11px] text-muted-foreground">{userSettings.title}</div>
              </div>
            </div>
            <Link to="/settings" className="flex items-center gap-3 px-3 py-1.5 mt-1 rounded-md text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent no-underline transition-colors">
              <span className="opacity-60"><Settings size={16} /></span>
              <span className="flex-1">Settings</span>
              {version && (
                <a
                  href="https://www.skool.com/experten-mastermind/classroom/ca0a1a51?md=73f0f413a1de4f708801e04575b2d6fd"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-[13px] no-underline transition-colors ${
                    updateAvailable
                      ? 'text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title={updateAvailable ? 'Update verfügbar! Klicke für die Anleitung.' : 'Mission Control Version'}
                  onClick={(e) => e.stopPropagation()}
                >
                  {updateAvailable ? '🔄 ' : 'v'}{version}
                </a>
              )}
            </Link>
          </>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Hamburger button - visible on mobile when sidebar is closed */}
      {!mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed top-3 left-3 z-30 md:hidden w-10 h-10 flex items-center justify-center rounded-lg bg-card border border-border text-foreground hover:bg-muted transition-colors shadow-sm"
          aria-label="Open menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      )}

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - Desktop: normal flow, Mobile: fixed overlay */}
      <aside className={`
        ${isCollapsed ? 'md:w-[52px]' : 'md:w-[240px]'}
        h-screen bg-sidebar-bg border-r border-border/30 flex flex-col flex-shrink-0 transition-all duration-200
        ${mobileOpen
          ? 'fixed inset-y-0 left-0 z-50 w-[240px]'
          : 'hidden md:flex'
        }
      `}>
        {sidebarContent}
      </aside>
    </>
  );
}
