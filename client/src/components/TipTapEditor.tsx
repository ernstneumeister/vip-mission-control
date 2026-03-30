import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table';
import { TableHeader } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Markdown } from 'tiptap-markdown';
import markdownit from 'markdown-it';
import GlobalDragHandle from 'tiptap-extension-global-drag-handle';
import { useEffect, useRef, useMemo } from 'react';
import { SlashCommand } from '../extensions/slash-command';
import { getSlashCommandSuggestion } from './SlashCommandList';

interface Props {
  content: string;
  onChange: (markdown: string) => void;
  editable?: boolean;
}

// Convert markdown to HTML using markdown-it (handles GFM tables correctly)
import taskLists from 'markdown-it-task-lists';
const md = markdownit({ html: true, linkify: true, typographer: true }).use(taskLists);

function renderFrontmatterBlock(raw: string): { frontmatterHtml: string; body: string } {
  if (!raw.startsWith('---')) return { frontmatterHtml: '', body: raw };
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return { frontmatterHtml: '', body: raw };
  const yamlBlock = raw.slice(4, end).trim();
  const body = raw.slice(end + 4).replace(/^\n+/, '');
  // Render as a styled info block
  const rows = yamlBlock.split('\n').map(line => {
    const sep = line.indexOf(':');
    if (sep === -1) return `<span style="color:var(--muted-foreground)">${line}</span>`;
    const key = line.slice(0, sep).trim();
    const val = line.slice(sep + 1).trim();
    return `<span style="color:var(--primary);font-weight:600">${key}</span><span style="color:var(--muted-foreground)">:</span> ${val}`;
  }).join('<br/>');
  const frontmatterHtml = `<div style="background:var(--muted);border:1px solid var(--border);border-radius:8px;padding:12px 16px;margin-bottom:16px;font-family:var(--font-mono,monospace);font-size:12px;line-height:1.7;color:var(--foreground)">${rows}</div>`;
  return { frontmatterHtml, body };
}

function markdownToHtml(markdown: string): string {
  const { frontmatterHtml, body } = renderFrontmatterBlock(markdown);
  return frontmatterHtml + md.render(body);
}

export default function TipTapEditor({ content, onChange, editable = true }: Props) {
  const isSettling = useRef(true);
  
  // Convert markdown to HTML for initial content
  const htmlContent = useMemo(() => markdownToHtml(content), [content]);
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Placeholder.configure({
        placeholder: 'Type "/" for commands...',
      }),
      Typography,
      Highlight.configure({ multicolor: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Markdown.configure({
        html: true,
        transformCopiedText: true,
        transformPastedText: true,
      }),
      SlashCommand.configure({
        suggestion: getSlashCommandSuggestion(),
      }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      GlobalDragHandle.configure({
        dragHandleWidth: 20,
      }),
    ],
    content: htmlContent,
    editable,
    parseOptions: {
      preserveWhitespace: false,
    },
    onUpdate: ({ editor }) => {
      if (isSettling.current) return; // Skip initial parse
      const md = editor.storage.markdown.getMarkdown();
      onChange(md);
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[500px]',
      },
    },
  });

  // Mark as settled after initial render
  useEffect(() => {
    if (editor) {
      isSettling.current = true;
      // Wait for TipTap to finish parsing then allow tracking
      const timer = setTimeout(() => { isSettling.current = false; }, 300);
      return () => clearTimeout(timer);
    }
  }, [editor]);

  useEffect(() => {
    if (editor && content !== editor.storage.markdown.getMarkdown()) {
      isSettling.current = true;
      // tiptap-markdown overrides setContent to parse as markdown.
      // We pass HTML (from markdown-it) which handles tables correctly.
      editor.commands.setContent(markdownToHtml(content));
      setTimeout(() => { isSettling.current = false; }, 300);
    }
  }, [content, editor]);

  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editor, editable]);

  if (!editor) return null;

  return (
    <div className="tiptap-editor h-full flex flex-col">
      {/* Bubble Menu - appears on text selection */}
      <BubbleMenu
        editor={editor}
        tippyOptions={{ duration: 150, placement: 'top' }}
        className="flex items-center gap-0.5 px-1 py-1 rounded-lg shadow-lg border border-border"
        style={{ backgroundColor: 'var(--card)' }}
      >
        <BubbleButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
          <strong>B</strong>
        </BubbleButton>
        <BubbleButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
          <em>I</em>
        </BubbleButton>
        <BubbleButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
          <s>S</s>
        </BubbleButton>
        <BubbleButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Code">
          {'</>'}
        </BubbleButton>
        <BubbleButton onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Highlight">
          <span style={{ backgroundColor: '#f9eabd', padding: '0 4px', borderRadius: '2px', fontWeight: 600, fontSize: '12px' }}>H</span>
        </BubbleButton>
        <BubbleDivider />
        <BubbleButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="H1">
          H1
        </BubbleButton>
        <BubbleButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="H2">
          H2
        </BubbleButton>
        <BubbleButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="H3">
          H3
        </BubbleButton>
      </BubbleMenu>

      {/* Editor area */}
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}

function BubbleButton({ children, onClick, active, title }: {
  children: React.ReactNode; onClick: () => void; active?: boolean; title?: string;
}) {
  return (
    <button onClick={onClick} title={title}
      className={`w-7 h-7 flex items-center justify-center rounded text-[12px] font-medium transition-colors ${
        active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >{children}</button>
  );
}

function BubbleDivider() {
  return <div className="w-px h-4 bg-border mx-0.5" />;
}
