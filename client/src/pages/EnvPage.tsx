import { useState, useEffect, useCallback } from 'react';
import { getEnvVars, getEnvVarValue, setEnvVar, deleteEnvVar } from '../api';
import { Key } from '../components/Icons';

interface EnvEntry {
  key: string;
  maskedValue: string;
  revealedValue?: string;
  isRevealed: boolean;
  isEditing: boolean;
  editValue: string;
}

export default function EnvPage() {
  const [entries, setEntries] = useState<EnvEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadVars = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getEnvVars();
      const sorted = Object.entries(data.vars)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, masked]) => ({
          key,
          maskedValue: masked,
          isRevealed: false,
          isEditing: false,
          editValue: '',
        }));
      setEntries(sorted);
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadVars(); }, [loadVars]);

  const handleReveal = async (key: string) => {
    try {
      const data = await getEnvVarValue(key);
      setEntries(prev => prev.map(e =>
        e.key === key ? { ...e, revealedValue: data.value, isRevealed: true } : e
      ));
    } catch (e: any) {
      setError(`Failed to reveal ${key}: ${e.message}`);
    }
  };

  const handleHide = (key: string) => {
    setEntries(prev => prev.map(e =>
      e.key === key ? { ...e, isRevealed: false } : e
    ));
  };

  const handleStartEdit = async (key: string) => {
    // Fetch real value first if not revealed
    const entry = entries.find(e => e.key === key);
    let value = entry?.revealedValue || '';
    if (!entry?.isRevealed) {
      try {
        const data = await getEnvVarValue(key);
        value = data.value;
      } catch (e: any) {
        setError(`Failed to load value: ${e.message}`);
        return;
      }
    }
    setEntries(prev => prev.map(e =>
      e.key === key ? { ...e, isEditing: true, editValue: value, isRevealed: true, revealedValue: value } : e
    ));
  };

  const handleCancelEdit = (key: string) => {
    setEntries(prev => prev.map(e =>
      e.key === key ? { ...e, isEditing: false } : e
    ));
  };

  const handleSaveEdit = async (key: string) => {
    const entry = entries.find(e => e.key === key);
    if (!entry) return;
    try {
      setSaving(true);
      await setEnvVar(key, entry.editValue);
      await loadVars();
    } catch (e: any) {
      setError(`Failed to save: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (key: string) => {
    try {
      await deleteEnvVar(key);
      setDeleteConfirm(null);
      await loadVars();
    } catch (e: any) {
      setError(`Failed to delete: ${e.message}`);
    }
  };

  const handleAdd = async () => {
    if (!newKey.trim() || !newValue.trim()) return;
    try {
      setSaving(true);
      await setEnvVar(newKey.trim(), newValue.trim());
      setAdding(false);
      setNewKey('');
      setNewValue('');
      await loadVars();
    } catch (e: any) {
      setError(`Failed to add: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const filtered = entries.filter(e =>
    e.key.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-3 md:p-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <Key size={20} className="text-amber-500" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-foreground">Environment Variables</h1>
            <p className="text-sm text-muted-foreground">{entries.length} variable{entries.length !== 1 ? 's' : ''} configured</p>
          </div>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2 self-start md:self-auto"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Variable
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 ml-2">✕</button>
        </div>
      )}

      {/* Add Form */}
      {adding && (
        <div className="mb-4 p-4 rounded-lg border border-border bg-card">
          <h3 className="text-sm font-semibold text-foreground mb-3">Add New Variable</h3>
          <div className="flex flex-col md:flex-row gap-3 md:items-end">
            <div className="flex-1">
              <label className="block text-xs text-muted-foreground mb-1">Key</label>
              <input
                type="text"
                value={newKey}
                onChange={e => setNewKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                placeholder="API_KEY_NAME"
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
            </div>
            <div className="flex-1 md:flex-[2]">
              <label className="block text-xs text-muted-foreground mb-1">Value</label>
              <input
                type="text"
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                placeholder="sk-..."
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={!newKey.trim() || !newValue.trim() || saving}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => { setAdding(false); setNewKey(''); setNewValue(''); }}
                className="px-4 py-2 border border-border rounded-md text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search variables..."
          className="w-full max-w-sm px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {entries.length === 0 ? 'No environment variables configured yet.' : 'No variables match your search.'}
        </div>
      ) : (
        <>
        {/* Mobile: Card layout */}
        <div className="md:hidden space-y-3">
          {filtered.map((entry) => (
            <div key={entry.key} className="border border-border rounded-lg p-3 bg-card">
              <div className="flex items-start justify-between gap-2 mb-2">
                <code className="text-sm font-mono text-foreground font-semibold break-all">{entry.key}</code>
                {!entry.isEditing && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => entry.isRevealed ? handleHide(entry.key) : handleReveal(entry.key)}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title={entry.isRevealed ? 'Hide' : 'Reveal'}
                    >
                      {entry.isRevealed ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => handleStartEdit(entry.key)}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Edit"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    {deleteConfirm === entry.key ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(entry.key)} className="px-2 py-1 bg-red-600 text-white rounded text-xs font-medium">Yes</button>
                        <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 border border-border rounded text-xs text-muted-foreground">No</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(entry.key)}
                        className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
              {entry.isEditing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={entry.editValue}
                    onChange={e => setEntries(prev => prev.map(x =>
                      x.key === entry.key ? { ...x, editValue: e.target.value } : x
                    ))}
                    className="w-full px-2 py-1 rounded border border-border bg-background text-foreground text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleSaveEdit(entry.key)} disabled={saving} className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50">Save</button>
                    <button onClick={() => handleCancelEdit(entry.key)} className="px-3 py-1 border border-border rounded text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                  </div>
                </div>
              ) : (
                <code className="text-sm font-mono text-muted-foreground break-all">
                  {entry.isRevealed ? entry.revealedValue : entry.maskedValue}
                </code>
              )}
            </div>
          ))}
        </div>

        {/* Desktop: Table layout */}
        <div className="hidden md:block border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-320px)] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10">
                <tr className="bg-card border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Key</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Value</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[180px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => (
                  <tr key={entry.key} className="border-b border-border/50 hover:bg-card/50 transition-colors">
                    <td className="px-4 py-3">
                      <code className="text-sm font-mono text-foreground">{entry.key}</code>
                    </td>
                    <td className="px-4 py-3">
                      {entry.isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={entry.editValue}
                            onChange={e => setEntries(prev => prev.map(x =>
                              x.key === entry.key ? { ...x, editValue: e.target.value } : x
                            ))}
                            className="flex-1 px-2 py-1 rounded border border-border bg-background text-foreground text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEdit(entry.key)}
                            disabled={saving}
                            className="px-2 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => handleCancelEdit(entry.key)}
                            className="px-2 py-1 border border-border rounded text-xs text-muted-foreground hover:text-foreground"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <code className="text-sm font-mono text-muted-foreground break-all">
                          {entry.isRevealed ? entry.revealedValue : entry.maskedValue}
                        </code>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!entry.isEditing && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => entry.isRevealed ? handleHide(entry.key) : handleReveal(entry.key)}
                            className="p-1.5 rounded hover:bg-card text-muted-foreground hover:text-foreground transition-colors"
                            title={entry.isRevealed ? 'Hide value' : 'Reveal value'}
                          >
                            {entry.isRevealed ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                                <line x1="1" y1="1" x2="23" y2="23"/>
                              </svg>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => handleStartEdit(entry.key)}
                            className="p-1.5 rounded hover:bg-card text-muted-foreground hover:text-foreground transition-colors"
                            title="Edit value"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          {deleteConfirm === entry.key ? (
                            <div className="flex items-center gap-1 ml-1">
                              <button
                                onClick={() => handleDelete(entry.key)}
                                className="px-2 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-2 py-1 border border-border rounded text-xs text-muted-foreground hover:text-foreground"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(entry.key)}
                              className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                              title="Delete variable"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
