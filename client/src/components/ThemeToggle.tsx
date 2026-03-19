import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'system';

const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) || 'system';
  });

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = () => {
      const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.classList.toggle('dark', dark);
    };
    applyTheme();
    localStorage.setItem('theme', theme);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => { if (theme === 'system') applyTheme(); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const toggle = () => {
    setTheme(prev => prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light');
  };

  return (
    <button
      onClick={toggle}
      className="relative flex items-center w-[52px] h-[26px] rounded-full transition-colors duration-200"
      style={{
        backgroundColor: isDark ? 'var(--muted)' : 'var(--border)',
      }}
      title={`Theme: ${theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light'}`}
    >
      {/* Sun icon - left */}
      <span className={`absolute left-1.5 transition-opacity ${isDark ? 'opacity-40' : 'opacity-80'}`} style={{ color: 'var(--foreground)' }}>
        <SunIcon />
      </span>
      {/* Moon icon - right */}
      <span className={`absolute right-1.5 transition-opacity ${isDark ? 'opacity-80' : 'opacity-40'}`} style={{ color: 'var(--foreground)' }}>
        <MoonIcon />
      </span>
      {/* Slider knob */}
      <span
        className="absolute w-[20px] h-[20px] rounded-full shadow-sm transition-all duration-200"
        style={{
          left: isDark ? '28px' : '3px',
          backgroundColor: isDark ? 'var(--primary)' : 'var(--card)',
        }}
      />
    </button>
  );
}
