import { useState, useEffect, useCallback, useRef } from 'react';
import TipTapEditor from '../components/TipTapEditor';
import { getDocTree, getDocFile, saveDocFile } from '../api';
import { Folder, FolderOpen, File, FileCode, FileText, Settings as GearIcon, Pin } from '../components/Icons';

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  modified?: string;
  children?: TreeNode[];
}

const PINNED_FILES = [
  { name: 'AGENTS.md', path: 'AGENTS.md' },
  { name: 'MEMORY.md', path: 'MEMORY.md' },
  { name: 'SOUL.md', path: 'SOUL.md' },
  { name: 'TOOLS.md', path: 'TOOLS.md' },
  { name: 'USER.md', path: 'USER.md' },
  { name: 'HEARTBEAT.md', path: 'HEARTBEAT.md' },
];

function FileIcon({ name }: { name: string }) {
  if (/\.md$/i.test(name)) return <File size={14} />;
  if (/\.json$/i.test(name)) return <FileText size={14} />;
  if (/\.(yml|yaml|sh|js|ts|css)$/i.test(name)) return <FileCode size={14} />;
  if (/\.txt$/i.test(name)) return <FileText size={14} />;
  return <File size={14} />;
}

function FileTreeItem({
  node,
  depth,
  activePath,
  expanded,
  onToggle,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  activePath: string | null;
  expanded: Record<string, boolean>;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
}) {
  const isDir = node.type === 'dir';
  const isOpen = expanded[node.path];
  const isActive = activePath === node.path;

  return (
    <div>
      <button
        onClick={() => (isDir ? onToggle(node.path) : onSelect(node.path))}
        className={`w-full text-left flex items-center gap-1.5 py-1 px-2 rounded text-[13px] transition-colors truncate ${
          isActive
            ? 'bg-sidebar-accent text-sidebar-primary font-medium'
            : 'text-sidebar-foreground hover:bg-sidebar-accent'
        }`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        title={node.path}
      >
        <span className="flex-shrink-0">
          {isDir ? (isOpen ? <FolderOpen size={14} /> : <Folder size={14} />) : <FileIcon name={node.name} />}
        </span>
        <span className="truncate">{node.name}</span>
      </button>
      {isDir && isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              activePath={activePath}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DocsPage() {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [activePath, setActivePath] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [treeLoading, setTreeLoading] = useState(true);
  const editorRef = useRef<HTMLDivElement>(null);

  const isDirty = content !== originalContent;

  // Load tree
  useEffect(() => {
    setTreeLoading(true);
    getDocTree()
      .then(setTree)
      .finally(() => setTreeLoading(false));
  }, []);

  // Toggle folder
  const handleToggle = useCallback((path: string) => {
    setExpanded((prev) => ({ ...prev, [path]: !prev[path] }));
  }, []);

  // Open file
  const handleSelect = useCallback(async (filePath: string) => {
    if (activePath === filePath) return;
    setLoading(true);
    try {
      const data = await getDocFile(filePath);
      setActivePath(filePath);
      setContent(data.content);
      setOriginalContent(data.content);
      setLastSaved(data.modified);
    } catch (e) {
      console.error('Failed to load file', e);
    } finally {
      setLoading(false);
    }
  }, [activePath]);

  // Save
  const handleSave = useCallback(async () => {
    if (!activePath || !isDirty) return;
    setSaving(true);
    try {
      const result = await saveDocFile(activePath, content);
      setOriginalContent(content);
      setLastSaved(result.modified);
    } catch (e) {
      console.error('Failed to save', e);
    } finally {
      setSaving(false);
    }
  }, [activePath, content, isDirty]);

  // Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  const breadcrumb = activePath
    ? ['OpenClaw', ...activePath.split('/')]
    : null;

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: File tree */}
      <div className="w-[250px] flex-shrink-0 bg-card border-r border-border flex flex-col overflow-hidden">
        <div className="px-3 py-2.5 border-b border-border">
          <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
            Files
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {/* Pinned section */}
          <div className="px-3 pt-2 pb-1 flex items-center gap-1.5">
            <Pin size={11} className="text-muted-foreground" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Pinned
            </span>
          </div>
          {PINNED_FILES.map((f) => (
            <button
              key={f.path}
              onClick={() => handleSelect(f.path)}
              className={`w-full text-left flex items-center gap-1.5 py-1 px-3 text-[13px] transition-colors truncate ${
                activePath === f.path
                  ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
            >
              <span className="flex-shrink-0"><File size={14} /></span>
              <span className="truncate">{f.name}</span>
            </button>
          ))}

          <div className="border-t border-border my-2 mx-3" />

          {/* File tree */}
          <div className="px-1">
            {treeLoading ? (
              <div className="px-3 py-4 text-[13px] text-muted-foreground">Loading…</div>
            ) : (
              tree.map((node) => (
                <FileTreeItem
                  key={node.path}
                  node={node}
                  depth={0}
                  activePath={activePath}
                  expanded={expanded}
                  onToggle={handleToggle}
                  onSelect={handleSelect}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right: Editor */}
      <div className="flex-1 flex flex-col overflow-hidden bg-card" ref={editorRef}>
        {activePath ? (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {breadcrumb && (
                  <div className="text-[12px] text-muted-foreground truncate flex items-center gap-1">
                    {breadcrumb.map((part, i) => (
                      <span key={i} className="flex items-center gap-1">
                        {i > 0 && <span className="text-muted-foreground/40">/</span>}
                        <span className={i === breadcrumb.length - 1 ? 'text-foreground font-medium' : ''}>
                          {part}
                        </span>
                      </span>
                    ))}
                    {isDirty && <span className="text-amber-500 ml-1" title="Unsaved changes">●</span>}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {lastSaved && (
                  <span className="text-[11px] text-muted-foreground">
                    Saved {formatTime(lastSaved)}
                  </span>
                )}
                <button
                  onClick={handleSave}
                  disabled={!isDirty || saving}
                  className={`px-3 py-1 rounded text-[13px] font-medium transition-colors ${
                    isDirty
                      ? 'bg-primary text-primary-foreground hover:opacity-90'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Loading…
                </div>
              ) : (
                <TipTapEditor
                  content={content}
                  onChange={(md) => setContent(md)}
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <div className="mb-3"><FileText size={48} className="mx-auto text-muted-foreground/50" /></div>
              <div className="text-[16px] font-medium text-muted-foreground">Select a file to edit</div>
              <div className="text-[13px] mt-1">
                Browse the file tree or use the pinned files for quick access
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
