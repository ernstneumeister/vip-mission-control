import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { LayoutDashboard, Bot, Radio, CheckSquare, FileText, Zap, BarChart, Settings, ChevronLeft, ChevronRight, Presentation, Key } from './Icons';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', disabled: true },
  { icon: Bot, label: 'Agents', path: '/agents', disabled: true },
  { icon: Radio, label: 'Activity', path: '/activity', disabled: true },
  { icon: CheckSquare, label: 'Tasks', path: '/tasks', disabled: false },
  { icon: Presentation, label: 'Webinar', path: '/webinar', disabled: false },
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

  const [version, setVersion] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
  };

  useEffect(() => {
    fetch('/api/version')
      .then(r => r.json())
      .then(d => {
        setVersion(d.version || null);
        setUpdateAvailable(d.updateAvailable || false);
      })
      .catch(() => {});
  }, []);

  return (
    <aside className={`${collapsed ? 'w-[52px]' : 'w-[240px]'} h-screen bg-sidebar-bg border-r border-border/30 flex flex-col flex-shrink-0 transition-all duration-200`}>
      {/* Header */}
      <div className={`flex items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-4'} h-[50px] border-b border-border/30`}>
        {!collapsed && (
          <Link to="/" className="text-[16px] font-bold text-foreground no-underline flex items-center gap-1.5">
            🎯 <span>Mission Control</span>
          </Link>
        )}
        <button
          onClick={toggleCollapsed}
          className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-sidebar-accent"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
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
                className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg text-[14px] font-medium text-muted-foreground cursor-not-allowed select-none`}
                title={collapsed ? item.label : undefined}
              >
                <span className="opacity-40 flex-shrink-0"><Icon size={18} /></span>
                {!collapsed && <span>{item.label}</span>}
              </div>
            );
          }
          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg text-[14px] font-medium no-underline transition-colors ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <span className="flex-shrink-0"><Icon size={18} /></span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom user section */}
      <div className="border-t border-border/30 px-3 py-3">
        {collapsed ? (
          <>
            <div className="flex justify-center py-1.5">
              <img src="/avatars/ernst.jpg" alt="Ernst" className="w-8 h-8 rounded-full object-cover" />
            </div>
            <div className="flex justify-center py-1.5 mt-1 text-muted-foreground opacity-40" title="Settings">
              <Settings size={16} />
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 px-2 py-1.5">
              <img src="/avatars/ernst.jpg" alt="Ernst" className="w-8 h-8 rounded-full object-cover" />
              <div>
                <div className="text-[13px] font-semibold text-foreground">Ernst</div>
                <div className="text-[11px] text-muted-foreground">Chief of Agents</div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-3 py-1.5 mt-1 rounded-md text-[13px] font-medium text-muted-foreground cursor-not-allowed">
              <span className="opacity-40"><Settings size={16} /></span>
              <span>Settings</span>
            </div>
            {version && (
              <a
                href="https://www.skool.com/experten-mastermind/classroom/ca0a1a51?md=73f0f413a1de4f708801e04575b2d6fd"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-1.5 px-3 py-1 mt-1 rounded text-[11px] no-underline transition-colors ${
                  updateAvailable
                    ? 'text-primary hover:bg-primary/10 font-medium'
                    : 'text-muted-foreground/60 hover:text-muted-foreground'
                }`}
                title={updateAvailable ? 'Update verfügbar! Klicke für die Anleitung.' : 'Mission Control Version'}
              >
                <span>{updateAvailable ? '🔄' : 'v'}{version}</span>
                {updateAvailable && <span className="text-[10px]">Update verfügbar</span>}
              </a>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
