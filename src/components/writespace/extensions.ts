"use client";

import { mergeAttributes, Node } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import CaptionedImageView from "@/components/writespace/CaptionedImageView";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pullQuote: {
      setPullQuote: () => ReturnType;
    };
    footnote: {
      insertFootnote: () => ReturnType;
    };
    ctaButton: {
      setCtaButton: (attrs?: { label?: string; href?: string }) => ReturnType;
    };
    paywallDivider: {
      setPaywallDivider: () => ReturnType;
    };
    captionedImage: {
      setCaptionedImage: (attrs: { src: string; caption?: string; alt?: string }) => ReturnType;
    };
  }
}

export const PullQuote = Node.create({
  name: "pullQuote",
  group: "block",
  content: "paragraph+",
  defining: true,
  parseHTML() {
    return [{ tag: 'blockquote[data-type="pull-quote"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "blockquote",
      mergeAttributes(HTMLAttributes, {
        "data-type": "pull-quote",
        class: "ws-pull-quote"
      }),
      0
    ];
  },
  addCommands() {
    return {
      setPullQuote:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            content: [{ type: "paragraph" }]
          })
    };
  }
});

export const Footnote = Node.create({
  name: "footnote",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-footnote-id"),
        renderHTML: (attributes) => ({ "data-footnote-id": attributes.id })
      },
      number: {
        default: 1,
        parseHTML: (element) => Number(element.getAttribute("data-footnote-number") || 1),
        renderHTML: (attributes) => ({ "data-footnote-number": attributes.number })
      },
      text: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-footnote-text") || "",
        renderHTML: (attributes) => ({ "data-footnote-text": attributes.text })
      }
    };
  },
  parseHTML() {
    return [{ tag: 'sup[data-type="footnote"]' }];
  },
  renderHTML({ HTMLAttributes, node }) {
    return [
      "sup",
      mergeAttributes(HTMLAttributes, {
        "data-type": "footnote",
        class: "ws-footnote",
        id: `fnref-${node.attrs.id || node.attrs.number}`
      }),
      `[${node.attrs.number || 1}]`
    ];
  },
  addCommands() {
    return {
      insertFootnote:
        () =>
        ({ editor, commands }) => {
          const notes: { id: string; text: string }[] = [];
          editor.state.doc.descendants((node) => {
            if (node.type.name === "footnote") {
              notes.push({ id: String(node.attrs.id || ""), text: String(node.attrs.text || "") });
            }
          });
          const nextNumber = notes.length + 1;
          const id = `fn-${Date.now().toString(36)}-${nextNumber}`;
          const text = window.prompt("Footnote text", "") || "";
          return commands.insertContent({
            type: this.name,
            attrs: { id, number: nextNumber, text }
          });
        }
    };
  }
});

export const CaptionedImage = Image.extend({
  name: "captionedImage",
  addAttributes() {
    return {
      ...this.parent?.(),
      caption: {
        default: "",
        parseHTML: (element) =>
          element.getAttribute("data-caption") ||
          element.querySelector("figcaption")?.textContent ||
          "",
        renderHTML: (attributes) => ({ "data-caption": attributes.caption || "" })
      }
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(CaptionedImageView);
  },
  renderHTML({ HTMLAttributes }) {
    const { caption, ...rest } = HTMLAttributes as Record<string, string>;
    return [
      "figure",
      { class: "ws-figure" },
      ["img", mergeAttributes(rest, { class: "ws-figure-img" })],
      ["figcaption", { class: "ws-figure-caption" }, caption || "Add a caption"]
    ];
  },
  addCommands() {
    return {
      setCaptionedImage:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              src: attrs.src,
              alt: attrs.alt || "",
              caption: attrs.caption || ""
            }
          })
    };
  }
});

export const CtaButton = Node.create({
  name: "ctaButton",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      label: { default: "Subscribe" },
      href: { default: "https://" }
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="cta-button"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "cta-button", class: "ws-cta" }),
      [
        "a",
        {
          href: HTMLAttributes.href,
          class: "ws-cta-link",
          target: "_blank",
          rel: "noreferrer"
        },
        HTMLAttributes.label || "Subscribe"
      ]
    ];
  },
  addCommands() {
    return {
      setCtaButton:
        (attrs) =>
        ({ commands }) => {
          const label = attrs?.label || window.prompt("Button label", "Subscribe") || "Subscribe";
          const href = attrs?.href || window.prompt("Button URL", "https://") || "https://";
          return commands.insertContent({
            type: this.name,
            attrs: { label, href }
          });
        }
    };
  }
});

export const PaywallDivider = Node.create({
  name: "paywallDivider",
  group: "block",
  atom: true,
  parseHTML() {
    return [{ tag: 'div[data-type="paywall-divider"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "paywall-divider",
        class: "ws-paywall",
        contenteditable: "false"
      }),
      ["span", { class: "ws-paywall-label" }, "Paywall · Free preview ends"]
    ];
  },
  addCommands() {
    return {
      setPaywallDivider:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name })
    };
  }
});
