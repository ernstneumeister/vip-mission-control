import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import { Search, File } from './Icons';
import { searchDocFiles } from '../api';

interface Props {
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

interface FileResult {
  name: string;
  path: string;
  matchType: string;
  snippet: string | null;
}

export default function Header({ searchQuery, onSearchChange }: Props) {
  const [fileResults, setFileResults] = useState<FileResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearch = useCallback((q: string) => {
    setLocalQuery(q);
    onSearchChange(q);
    setSelectedIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.trim().length < 2) {
      setFileResults([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchDocFiles(q.trim());
        setFileResults(data.results);
        setShowDropdown(data.results.length > 0);
      } catch {
        setFileResults([]);
      }
    }, 200);
  }, [onSearchChange]);

  const handleSelect = useCallback((filePath: string) => {
    setShowDropdown(false);
    setLocalQuery('');
    onSearchChange('');
    navigate(`/docs?file=${encodeURIComponent(filePath)}`);
  }, [navigate, onSearchChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showDropdown || fileResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, fileResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(fileResults[selectedIndex].path);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  }, [showDropdown, fileResults, selectedIndex, handleSelect]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Sync external searchQuery changes
  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  return (
    <header className="h-[50px] bg-background border-b border-border flex items-center pl-14 pr-4 md:px-5 flex-shrink-0">
      <div className="flex-1 flex justify-center">
        <div className="relative w-full max-w-[400px]" ref={dropdownRef}>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search files, tasks, activity..."
            value={localQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => { if (fileResults.length > 0) setShowDropdown(true); }}
            onKeyDown={handleKeyDown}
            className="w-full h-[36px] bg-muted border border-border rounded-lg pl-9 pr-3 text-[13px] text-foreground placeholder-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors"
          />
          {showDropdown && fileResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 max-h-[360px] overflow-y-auto">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                Files ({fileResults.length}{fileResults.length >= 30 ? '+' : ''})
              </div>
              {fileResults.map((file, i) => (
                <button
                  key={file.path}
                  onClick={() => handleSelect(file.path)}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2.5 text-[13px] transition-colors ${
                    i === selectedIndex
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <File size={14} className="flex-shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{file.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{file.path}</div>
                    {file.snippet && (
                      <div className="text-[11px] text-muted-foreground/70 truncate mt-0.5 italic">
                        {file.snippet}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
      </div>
    </header>
  );
}
