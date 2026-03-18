import { useLocation, Link } from 'react-router-dom';

const navItems = [
  { icon: '📊', label: 'Dashboard', path: '/dashboard', disabled: true },
  { icon: '🤖', label: 'Agents', path: '/agents', disabled: true },
  { icon: '📡', label: 'Activity', path: '/activity', disabled: true },
  { icon: '✅', label: 'Tasks', path: '/tasks', disabled: false },
  { icon: '⚡', label: 'Skills', path: '/skills', disabled: true },
  { icon: '📈', label: 'Usage', path: '/usage', disabled: true },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-[180px] h-screen bg-white border-r border-[#E5E7EB] flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="px-4 py-4 border-b border-[#E5E7EB]">
        <Link to="/" className="text-[16px] font-bold text-[#111827] no-underline flex items-center gap-1.5">
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
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[14px] font-medium text-[#9CA3AF] cursor-not-allowed select-none"
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
                  ? 'bg-[#DBEAFE] text-[#2563EB]'
                  : 'text-[#374151] hover:bg-[#F3F4F6]'
              }`}
            >
              <span className="text-[16px]">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom user section */}
      <div className="border-t border-[#E5E7EB] px-3 py-3">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <img src="/avatars/henry.jpg" alt="Henry" className="w-8 h-8 rounded-full object-cover" />
          <div>
            <div className="text-[13px] font-semibold text-[#111827]">Henry</div>
            <div className="text-[11px] text-[#9CA3AF]">Orchestrator</div>
          </div>
        </div>
        <div className="flex items-center gap-2.5 px-3 py-1.5 mt-1 rounded-md text-[13px] font-medium text-[#9CA3AF] cursor-not-allowed">
          <span className="text-[14px] opacity-40">⚙️</span>
          <span>Settings</span>
        </div>
      </div>
    </aside>
  );
}
