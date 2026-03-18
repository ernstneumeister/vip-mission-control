import { useLocation, Link } from 'react-router-dom';

const navItems = [
  { icon: '📊', label: 'Dashboard', path: '/dashboard', disabled: true },
  { icon: '🤖', label: 'Agents', path: '/agents', disabled: true },
  { icon: '📡', label: 'Activity', path: '/activity', disabled: true },
  { icon: '✅', label: 'Tasks', path: '/tasks', disabled: false },
  { icon: '📝', label: 'Docs', path: '/docs', disabled: false },
  { icon: '⚡', label: 'Skills', path: '/skills', disabled: true },
  { icon: '📈', label: 'Usage', path: '/usage', disabled: true },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-[180px] h-screen bg-sidebar-bg border-r border-sidebar-border flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="px-4 py-4 border-b border-sidebar-border">
        <Link to="/" className="text-[16px] font-bold text-foreground no-underline flex items-center gap-1.5">
          🎯 <span>Mission Control</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          if (item.disabled) {
            return (
              <div
                key={item.label}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[14px] font-medium text-muted-foreground cursor-not-allowed select-none"
              >
                <span className="text-[16px] opacity-40">{item.icon}</span>
                <span>{item.label}</span>
              </div>
            );
          }
          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[14px] font-medium no-underline transition-colors ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
            >
              <span className="text-[16px]">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom user section */}
      <div className="border-t border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <img src="/avatars/ernst.jpg" alt="Ernst" className="w-8 h-8 rounded-full object-cover" />
          <div>
            <div className="text-[13px] font-semibold text-foreground">Ernst</div>
            <div className="text-[11px] text-muted-foreground">Chief of Agents</div>
          </div>
        </div>
        <div className="flex items-center gap-2.5 px-3 py-1.5 mt-1 rounded-md text-[13px] font-medium text-muted-foreground cursor-not-allowed">
          <span className="text-[14px] opacity-40">⚙️</span>
          <span>Settings</span>
        </div>
      </div>
    </aside>
  );
}
