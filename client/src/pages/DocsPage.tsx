import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
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

const DEFAULT_PINNED = ['AGENTS.md', 'MEMORY.md', 'SOUL.md', 'TOOLS.md', 'USER.md', 'HEARTBEAT.md'];

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
  onTogglePin,
  isPinnedFn,
}: {
  node: TreeNode;
  depth: number;
  activePath: string | null;
  expanded: Record<string, boolean>;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  onTogglePin: (path: string) => void;
  isPinnedFn: (path: string) => boolean;
}) {
  const isDir = node.type === 'dir';
  const isOpen = expanded[node.path];
  const isActive = activePath === node.path;
  const pinned = !isDir && isPinnedFn(node.path);

  return (
    <div>
      {isDir ? (
        <>
          <button
            onClick={() => onToggle(node.path)}
            className={`w-full text-left flex items-center gap-1.5 py-1 px-2 rounded text-[13px] transition-colors truncate ${
              isActive
                ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                : 'text-sidebar-foreground hover:bg-sidebar-accent'
            }`}
            style={{ paddingLeft: `${depth * 14 + 8}px` }}
            title={node.path}
          >
            <span className="flex-shrink-0">
              {isOpen ? <FolderOpen size={14} /> : <Folder size={14} />}
            </span>
            <span className="truncate">{node.name}</span>
          </button>
          {isOpen && node.children && (
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
                  onTogglePin={onTogglePin}
                  isPinnedFn={isPinnedFn}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="group/pin flex items-center">
          <button
            onClick={() => onSelect(node.path)}
            className={`flex-1 text-left flex items-center gap-1.5 py-1 px-2 rounded text-[13px] transition-colors truncate ${
              isActive
                ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                : 'text-sidebar-foreground hover:bg-sidebar-accent'
            }`}
            style={{ paddingLeft: `${depth * 14 + 8}px` }}
            title={node.path}
          >
            <span className="text-[14px] flex-shrink-0">
              <FileIcon name={node.name} />
            </span>
            <span className="truncate">{node.name}</span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onTogglePin(node.path); }}
            className={`p-1 mr-1 transition-opacity ${
              pinned
                ? 'opacity-100 text-primary'
                : 'opacity-0 group-hover/pin:opacity-100 text-muted-foreground hover:text-primary'
            }`}
            title={pinned ? 'Unpin' : 'Pin'}
          >
            <Pin size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

function DragGrip() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <circle cx="3" cy="2" r="1.2" /><circle cx="7" cy="2" r="1.2" />
      <circle cx="3" cy="7" r="1.2" /><circle cx="7" cy="7" r="1.2" />
      <circle cx="3" cy="12" r="1.2" /><circle cx="7" cy="12" r="1.2" />
    </svg>
  );
}

export default function DocsPage() {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [activePath, setActivePath] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [treeLoading, setTreeLoading] = useState(true);
  const editorRef = useRef<HTMLDivElement>(null);

  // Drag & Drop state for pinned files
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const [pinnedPaths, setPinnedPaths] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('docs-pinned-files');
      return stored ? JSON.parse(stored) : DEFAULT_PINNED;
    } catch {
      return DEFAULT_PINNED;
    }
  });

  useEffect(() => {
    localStorage.setItem('docs-pinned-files', JSON.stringify(pinnedPaths));
  }, [pinnedPaths]);

  const togglePin = useCallback((filePath: string) => {
    setPinnedPaths(prev => {
      if (prev.includes(filePath)) {
        return prev.filter(p => p !== filePath);
      } else {
        return [...prev, filePath];
      }
    });
  }, []);

  const isPinned = useCallback((filePath: string) => pinnedPaths.includes(filePath), [pinnedPaths]);

  // Drag & Drop handlers for pinned files reordering
  const handlePinDragStart = useCallback((e: React.DragEvent, index: number) => {
    dragIndexRef.current = index;
    setDraggingIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `pinned-reorder-${index}`);
  }, []);

  const handlePinDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragIndexRef.current === null) return;
    setDragOverIndex(index);
  }, []);

  const handlePinDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const fromIndex = dragIndexRef.current;
    if (fromIndex === null || fromIndex === dropIndex) {
      setDragOverIndex(null);
      setDraggingIndex(null);
      dragIndexRef.current = null;
      return;
    }
    setPinnedPaths(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(dropIndex, 0, moved);
      return next;
    });
    setDragOverIndex(null);
    setDraggingIndex(null);
    dragIndexRef.current = null;
  }, []);

  const handlePinDragEnd = useCallback(() => {
    setDragOverIndex(null);
    setDraggingIndex(null);
    dragIndexRef.current = null;
  }, []);

  const [hasUserEdited, setHasUserEdited] = useState(false);
  const isDirty = hasUserEdited && content !== originalContent;

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

  // Track when user makes actual edits vs TipTap's initial parse
  const handleEditorChange = useCallback((md: string) => {
    setContent(md);
    setHasUserEdited(true);
  }, []);

  // Open file
  const handleSelect = useCallback(async (filePath: string) => {
    setLoading(true);
    setHasUserEdited(false);
    try {
      const data = await getDocFile(filePath);
      setActivePath(filePath);
      setContent(data.content);
      setOriginalContent(data.content);
      setLastSaved(data.modified);
      // Update URL with file path for deep linking
      setSearchParams({ file: filePath }, { replace: true });
    } catch (e) {
      console.error('Failed to load file', e);
    } finally {
      setLoading(false);
    }
  }, [activePath, setSearchParams]);

  // Load file from URL query param on mount
  useEffect(() => {
    const fileParam = searchParams.get('file');
    if (fileParam && !activePath) {
      handleSelect(fileParam);
      // Auto-expand parent folders
      const parts = fileParam.split('/');
      const expanded: Record<string, boolean> = {};
      for (let i = 1; i < parts.length; i++) {
        expanded[parts.slice(0, i).join('/')] = true;
      }
      setExpanded(prev => ({ ...prev, ...expanded }));
    }
  }, [searchParams]);

  // Save
  const handleSave = useCallback(async () => {
    if (!activePath || !isDirty) return;
    setSaving(true);
    try {
      const result = await saveDocFile(activePath, content);
      setOriginalContent(content);
      setHasUserEdited(false);
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
      <div className="w-[250px] flex-shrink-0 bg-background border-r border-border flex flex-col overflow-hidden">
        <div className="px-3 py-2.5 border-b border-border">
          <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
            Files
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {/* Pinned section */}
          {pinnedPaths.length > 0 && (
            <>
              <div className="px-3 pt-2 pb-1 flex items-center gap-1.5">
                <Pin size={11} className="text-muted-foreground" />
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Pinned
                </span>
              </div>
              {pinnedPaths.map((filePath, index) => {
                const fileName = filePath.split('/').pop() || filePath;
                const isDragging = draggingIndex === index;
                const isOver = dragOverIndex === index;
                return (
                  <div
                    key={filePath}
                    draggable
                    onDragStart={(e) => handlePinDragStart(e, index)}
                    onDragOver={(e) => handlePinDragOver(e, index)}
                    onDrop={(e) => handlePinDrop(e, index)}
                    onDragEnd={handlePinDragEnd}
                    className={`group flex items-center relative transition-opacity ${
                      isDragging ? 'opacity-40' : ''
                    }`}
                    style={{ cursor: 'grab' }}
                  >
                    {isOver && dragIndexRef.current !== index && (
                      <div className="absolute left-2 right-2 top-0 h-[2px] bg-primary rounded-full z-10" />
                    )}
                    <span
                      className="flex-shrink-0 pl-1.5 opacity-0 group-hover:opacity-60 text-muted-foreground cursor-grab active:cursor-grabbing"
                    >
                      <DragGrip />
                    </span>
                    <button
                      onClick={() => handleSelect(filePath)}
                      className={`flex-1 text-left flex items-center gap-1.5 py-1 px-1.5 text-[13px] transition-colors truncate ${
                        activePath === filePath
                          ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent'
                      }`}
                    >
                      <span className="flex-shrink-0"><File size={14} /></span>
                      <span className="truncate">{fileName}</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); togglePin(filePath); }}
                      className="opacity-0 group-hover:opacity-100 p-1 mr-1 text-muted-foreground hover:text-primary transition-opacity"
                      title="Unpin"
                    >
                      <Pin size={12} className="text-primary" />
                    </button>
                  </div>
                );
              })}
              <div className="border-t border-border my-2 mx-3" />
            </>
          )}

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
                  onTogglePin={togglePin}
                  isPinnedFn={isPinned}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right: Editor */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background" ref={editorRef}>
        {activePath ? (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background flex-shrink-0">
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

                    {activePath && (
                      <button
                        onClick={() => togglePin(activePath)}
                        className={`ml-1.5 transition-colors ${
                          isPinned(activePath) ? 'text-primary' : 'text-muted-foreground/40 hover:text-muted-foreground'
                        }`}
                        title={isPinned(activePath) ? 'Unpin file' : 'Pin file'}
                      >
                        <Pin size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {isDirty ? (
                  <span className="text-[12px] text-primary font-medium animate-pulse">
                    Ungespeicherte Änderungen
                  </span>
                ) : lastSaved ? (
                  <span className="text-[11px] text-muted-foreground">
                    Gespeichert {formatTime(lastSaved)}
                  </span>
                ) : null}
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
                  onChange={handleEditorChange}
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
