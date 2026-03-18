import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import { Markdown } from 'tiptap-markdown';
import GlobalDragHandle from 'tiptap-extension-global-drag-handle';
import { useEffect, useRef } from 'react';
import { SlashCommand } from '../extensions/slash-command';
import { getSlashCommandSuggestion } from './SlashCommandList';

interface Props {
  content: string;
  onChange: (markdown: string) => void;
  editable?: boolean;
}

export default function TipTapEditor({ content, onChange, editable = true }: Props) {
  const isSettling = useRef(true);
  
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
      Markdown.configure({
        html: false,
        transformCopiedText: true,
        transformPastedText: true,
      }),
      SlashCommand.configure({
        suggestion: getSlashCommandSuggestion(),
      }),
      GlobalDragHandle.configure({
        dragHandleWidth: 20,
      }),
    ],
    content,
    editable,
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
      editor.commands.setContent(content);
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
