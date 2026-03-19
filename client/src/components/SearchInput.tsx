import { Search } from './Icons';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchInput({ value, onChange, placeholder = 'Search...', className = '' }: Props) {
  return (
    <div className={`relative ${className}`}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-[36px] bg-muted border border-border rounded-lg pl-9 pr-3 text-[13px] text-foreground placeholder-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors"
      />
    </div>
  );
}
