import ThemeToggle from './ThemeToggle';
import SearchInput from './SearchInput';

interface Props {
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export default function Header({ searchQuery, onSearchChange }: Props) {
  return (
    <header className="h-[50px] bg-background border-b border-border flex items-center px-5 flex-shrink-0">
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
