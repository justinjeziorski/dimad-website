"use client";

import { Extension } from "@tiptap/core";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  type KeyboardEvent
} from "react";

type SlashItem = {
  title: string;
  description: string;
  command: (props: { editor: any; range: any }) => void;
};

function items(query: string): SlashItem[] {
  const all: SlashItem[] = [
    {
      title: "Pull quote",
      description: "Centered Substack-style quote",
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setPullQuote().run()
    },
    {
      title: "Footnote",
      description: "Insert numbered footnote marker",
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertFootnote().run()
    },
    {
      title: "Image",
      description: "Upload image with caption",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        window.dispatchEvent(new CustomEvent("ws-upload-image"));
      }
    },
    {
      title: "CTA button",
      description: "Custom label + URL button",
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setCtaButton().run()
    },
    {
      title: "Paywall divider",
      description: "Free preview ends here",
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setPaywallDivider().run()
    },
    {
      title: "Heading 1",
      description: "Large section heading",
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 1 }).run()
    },
    {
      title: "Heading 2",
      description: "Medium section heading",
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 2 }).run()
    },
    {
      title: "Bullet list",
      description: "Unordered list",
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run()
    },
    {
      title: "Numbered list",
      description: "Ordered list",
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run()
    },
    {
      title: "Code block",
      description: "Fenced code block",
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
    },
    {
      title: "Divider",
      description: "Horizontal rule",
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run()
    }
  ];
  const q = query.trim().toLowerCase();
  if (!q) return all;
  return all.filter((item) => item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q));
}

const SlashList = forwardRef(function SlashList(
  props: { items: SlashItem[]; command: (item: SlashItem) => void },
  ref
) {
  const [selected, setSelected] = useState(0);

  useEffect(() => setSelected(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        setSelected((value) => (value + props.items.length - 1) % props.items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelected((value) => (value + 1) % props.items.length);
        return true;
      }
      if (event.key === "Enter") {
        const item = props.items[selected];
        if (item) props.command(item);
        return true;
      }
      return false;
    }
  }));

  if (!props.items.length) return <div className="ws-slash">No commands</div>;

  return (
    <div className="ws-slash">
      {props.items.map((item, index) => (
        <button
          key={item.title}
          type="button"
          className={index === selected ? "is-selected" : ""}
          onClick={() => props.command(item)}
        >
          <strong>{item.title}</strong>
          <div style={{ color: "#94a3b8", fontSize: 11 }}>{item.description}</div>
        </button>
      ))}
    </div>
  );
});

export const SlashCommand = Extension.create({
  name: "slashCommand",
  addOptions() {
    return {
      suggestion: {
        char: "/",
        startOfLine: false,
        items: ({ query }) => items(query),
        render: () => {
          let component: ReactRenderer | null = null;
          let popup: TippyInstance[] | null = null;

          return {
            onStart: (props) => {
              component = new ReactRenderer(SlashList, {
                props,
                editor: props.editor
              });
              if (!props.clientRect) return;
              popup = tippy("body", {
                getReferenceClientRect: props.clientRect as () => DOMRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start"
              });
            },
            onUpdate: (props) => {
              component?.updateProps(props);
              popup?.[0]?.setProps({
                getReferenceClientRect: props.clientRect as () => DOMRect
              });
            },
            onKeyDown: (props) => {
              if (props.event.key === "Escape") {
                popup?.[0]?.hide();
                return true;
              }
              return (component?.ref as { onKeyDown?: (p: unknown) => boolean })?.onKeyDown?.(props) || false;
            },
            onExit: () => {
              popup?.[0]?.destroy();
              component?.destroy();
            }
          };
        },
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        }
      } as Partial<SuggestionOptions>
    };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion
      })
    ];
  }
});
