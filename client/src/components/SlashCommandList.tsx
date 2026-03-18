import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';

interface CommandItem {
  title: string;
  description: string;
  icon: string;
  command: (editor: any, range: any) => void;
}

const COMMANDS: CommandItem[] = [
  {
    title: 'Text',
    description: 'Plain text block',
    icon: 'T',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    title: 'Heading 1',
    description: 'Large heading',
    icon: 'H1',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    title: 'Heading 2',
    description: 'Medium heading',
    icon: 'H2',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    title: 'Heading 3',
    description: 'Small heading',
    icon: 'H3',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    },
  },
  {
    title: 'Bullet List',
    description: 'Unordered list',
    icon: '•',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: 'Numbered List',
    description: 'Ordered list',
    icon: '1.',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: 'Code Block',
    description: 'Code snippet',
    icon: '</>',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: 'Blockquote',
    description: 'Quote block',
    icon: '"',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: 'Divider',
    description: 'Horizontal line',
    icon: '—',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
];

interface Props {
  items: CommandItem[];
  command: (item: CommandItem) => void;
}

export const SlashCommandList = forwardRef<any, Props>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => setSelectedIndex(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((i) => (i + items.length - 1) % items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((i) => (i + 1) % items.length);
        return true;
      }
      if (event.key === 'Enter') {
        if (items[selectedIndex]) command(items[selectedIndex]);
        return true;
      }
      return false;
    },
  }));

  if (!items.length) return null;

  return (
    <div
      className="rounded-xl shadow-lg border overflow-hidden max-h-[300px] overflow-y-auto w-[220px]"
      style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
    >
      {items.map((item, idx) => (
        <button
          key={item.title}
          onClick={() => command(item)}
          className={`w-full text-left flex items-center gap-3 px-3 py-2 text-[13px] transition-colors ${
            idx === selectedIndex ? 'bg-primary/10' : 'hover:bg-muted/50'
          }`}
          style={{ color: 'var(--foreground)' }}
        >
          <span
            className="w-8 h-8 flex items-center justify-center rounded-md text-[12px] font-bold flex-shrink-0"
            style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
          >
            {item.icon}
          </span>
          <div>
            <div className="font-medium">{item.title}</div>
            <div className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>{item.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
});

SlashCommandList.displayName = 'SlashCommandList';

export function getSlashCommandSuggestion() {
  return {
    items: ({ query }: { query: string }) => {
      return COMMANDS.filter((item) =>
        item.title.toLowerCase().includes(query.toLowerCase())
      );
    },
    render: () => {
      let component: any = null;
      let popup: any = null;

      return {
        onStart: async (props: any) => {
          const { ReactRenderer } = await import('@tiptap/react');
          const tippy = (await import('tippy.js')).default;

          component = new ReactRenderer(SlashCommandList, {
            props,
            editor: props.editor,
          });

          if (!props.clientRect) return;

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          });
        },
        onUpdate: (props: any) => {
          component?.updateProps(props);
          if (!props.clientRect) return;
          popup?.[0]?.setProps({ getReferenceClientRect: props.clientRect });
        },
        onKeyDown: (props: any) => {
          if (props.event.key === 'Escape') {
            popup?.[0]?.hide();
            return true;
          }
          return component?.ref?.onKeyDown?.(props);
        },
        onExit: () => {
          popup?.[0]?.destroy();
          component?.destroy();
        },
      };
    },
  };
}
