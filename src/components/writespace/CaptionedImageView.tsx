"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useState, type FormEvent } from "react";

export default function CaptionedImageView({ node, updateAttributes, selected }: NodeViewProps) {
  const [caption, setCaption] = useState(String(node.attrs.caption || ""));

  function commitCaption(event: FormEvent<HTMLElement>) {
    const next = event.currentTarget.textContent?.trim() || "";
    setCaption(next);
    updateAttributes({ caption: next });
  }

  return (
    <NodeViewWrapper className={`ws-figure${selected ? " is-selected" : ""}`} data-drag-handle>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={String(node.attrs.src || "")} alt={String(node.attrs.alt || "")} className="ws-figure-img" />
      <figcaption
        className="ws-figure-caption"
        contentEditable
        suppressContentEditableWarning
        onBlur={commitCaption}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
      >
        {caption || "Add a caption"}
      </figcaption>
    </NodeViewWrapper>
  );
}
