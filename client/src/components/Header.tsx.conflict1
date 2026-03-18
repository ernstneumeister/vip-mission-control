import { useState, useEffect } from 'react';
import ThemeToggle from './ThemeToggle';
import SearchInput from './SearchInput';

interface Props {
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export default function Header({ searchQuery, onSearchChange }: Props) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const dateStr = time.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Berlin',
  });
  const timeStr = time.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Berlin',
  });

  return (
    <header className="h-[50px] bg-card border-b border-border flex items-center px-5 flex-shrink-0">
      <div className="text-[13px] text-muted-foreground font-mono whitespace-nowrap">
        {dateStr} · {timeStr} Uhr
      </div>
      <div className="flex-1 flex justify-center">
        <SearchInput
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Search tasks, activity, jobs..."
          className="w-[300px]"
        />
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
      </div>
    </header>
  );
}
