"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { uploadToDimDrive } from "@/lib/dimdrive/store";
import {
  countWords,
  getWritingsAuth,
  loadWriting,
  newWritingId,
  readingMinutes,
  saveWriting,
  type WriteMode,
  type WritingDoc
} from "@/lib/writespace/writings";
import {
  CaptionedImage,
  CtaButton,
  Footnote,
  PaywallDivider,
  PullQuote
} from "@/components/writespace/extensions";
import { SlashCommand } from "@/components/writespace/SlashCommand";
import WriteSpaceStyles from "@/components/writespace/WriteSpaceStyles";

const lowlight = createLowlight(common);
const DRAFT_KEY = "dimad_writespace_tiptap";

const DEFAULT_TITLE = "The Art of Deep Work in an Era of Digital Distraction";
const DEFAULT_SUBTITLE =
  "How modern writers build concentration reserves and produce high-impact essays.";
const DEFAULT_HTML = `<p>In an age dominated by instant notifications and relentless feeds, the ability to maintain deep focus has become both extraordinarily rare and immensely valuable.</p><p>For essayists and newsletter creators, writing is not merely typing words onto a screen; it is an act of synthesis. When we allow our focus to fragment every six minutes, we severely impair our capacity for high-level creative thinking.</p><p>To construct compelling arguments and memorable prose, writers must cultivate dedicated zones of solitude. By removing visual noise and establishing intentional distribution pipelines, the friction between thought and published work disappears.</p><p>Here are three core principles for maintaining a flow state:</p><ol><li><p>Eliminate non-essential visual triggers during draft mode.</p></li><li><p>Separate the acts of drafting, line-editing, and publishing into distinct sessions.</p></li><li><p>Leverage modern assistance tools for polishing, while preserving your authentic voice.</p></li></ol>`;

type DraftState = {
  id: string;
  title: string;
  subtitle: string;
  mode: WriteMode;
  contentJson: unknown;
  contentHtml: string;
  createdAt: number;
};

function readDraft(): DraftState | null {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
  } catch {
    return null;
  }
}

function writeDraft(draft: DraftState) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export default function WriteSpaceStudio() {
  const draft = useMemo(() => readDraft(), []);
  const [user, setUser] = useState<User | null>(null);
  const [docId, setDocId] = useState(draft?.id || newWritingId());
  const [title, setTitle] = useState(draft?.title || DEFAULT_TITLE);
  const [subtitle, setSubtitle] = useState(draft?.subtitle || DEFAULT_SUBTITLE);
  const [mode, setMode] = useState<WriteMode>(draft?.mode || "substack");
  const [preview, setPreview] = useState<"off" | "desktop" | "mobile">("off");
  const [status, setStatus] = useState("Ready");
  const [createdAt, setCreatedAt] = useState(draft?.createdAt || Date.now());
  const [words, setWords] = useState(0);
  const saveTimer = useRef<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const linkPromptRef = useRef<() => void>(() => {});
  const metaRef = useRef({
    docId,
    title,
    subtitle,
    mode,
    createdAt,
    user
  });
  metaRef.current = { docId, title, subtitle, mode, createdAt, user };

  const scheduleSave = useCallback((contentJson: unknown, contentHtml: string, text: string) => {
    const meta = metaRef.current;
    const wordCount = countWords(text);
    const payload: DraftState = {
      id: meta.docId,
      title: meta.title,
      subtitle: meta.subtitle,
      mode: meta.mode,
      contentJson,
      contentHtml,
      createdAt: meta.createdAt
    };
    writeDraft(payload);
    setStatus("Saving…");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      const latest = metaRef.current;
      if (!latest.user) {
        setStatus("Saved locally");
        return;
      }
      try {
        const writing: WritingDoc = {
          id: latest.docId,
          title: latest.title,
          subtitle: latest.subtitle,
          mode: latest.mode,
          contentHtml,
          contentJson,
          wordCount,
          updatedAt: Date.now(),
          createdAt: latest.createdAt
        };
        await saveWriting(latest.user.uid, writing);
        setStatus("Saved");
      } catch {
        setStatus("Local only · cloud save failed");
      }
    }, 800);
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3] }
      }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({
        placeholder: ({ node }) =>
          node.type.name === "heading" ? "Heading" : "Start writing… Type / for Substack blocks"
      }),
      CodeBlockLowlight.configure({ lowlight }),
      PullQuote,
      Footnote,
      CaptionedImage.configure({ inline: false, allowBase64: false }),
      CtaButton,
      PaywallDivider,
      SlashCommand
    ],
    content: (draft?.contentJson as object) || DEFAULT_HTML,
    editorProps: {
      attributes: {
        class: "ws-prose",
        spellcheck: "true"
      },
      handleKeyDown: (_view, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
          event.preventDefault();
          linkPromptRef.current();
          return true;
        }
        return false;
      }
    },
    onUpdate: ({ editor: current }) => {
      setWords(countWords(current.getText()));
      scheduleSave(current.getJSON(), current.getHTML(), current.getText());
    }
  });

  useEffect(() => onAuthStateChanged(getWritingsAuth(), setUser), []);

  useEffect(() => {
    if (!editor) return;
    setWords(countWords(editor.getText()));
  }, [editor]);

  useEffect(() => {
    function onUpload() {
      fileInput.current?.click();
    }
    window.addEventListener("ws-upload-image", onUpload);
    return () => window.removeEventListener("ws-upload-image", onUpload);
  }, []);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data;
      if (!data || data.type !== "writespace:load" || !editor) return;
      const payload = data.payload || {};
      const nextId = String(data.id || newWritingId());
      setDocId(nextId);
      setCreatedAt(Date.now());
      setTitle(String(payload.title || ""));
      setSubtitle(String(payload.subtitle || ""));
      setMode(payload.mode === "word" ? "word" : "substack");
      if (payload.contentJson) editor.commands.setContent(payload.contentJson as object);
      else if (payload.contentHtml) editor.commands.setContent(String(payload.contentHtml));
      else if (payload.bodyText) {
        const paragraphs = String(payload.bodyText)
          .split(/\n{2,}/)
          .map((block: string) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
          .join("");
        editor.commands.setContent(paragraphs || "<p></p>");
      }
      setStatus("Loaded from DimDrive");
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [editor]);

  useEffect(() => {
    async function maybeLoad() {
      if (!user || !docId) return;
      try {
        const remote = await loadWriting(user.uid, docId);
        if (!remote || !editor) return;
        if (remote.updatedAt <= (readDraft()?.createdAt || 0) && draft?.contentJson) return;
        setTitle(remote.title || "");
        setSubtitle(remote.subtitle || "");
        setMode(remote.mode || "substack");
        if (remote.contentJson) editor.commands.setContent(remote.contentJson as object);
        else if (remote.contentHtml) editor.commands.setContent(remote.contentHtml);
      } catch {
        /* keep local draft */
      }
    }
    void maybeLoad();
  }, [user, docId, editor, draft?.contentJson]);

  useEffect(() => {
    if (!editor) return;
    scheduleSave(editor.getJSON(), editor.getHTML(), editor.getText());
  }, [title, subtitle, mode, editor, scheduleSave]);

  function setLink() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href || "https://";
    const href = window.prompt("Link URL", previous);
    if (href === null) return;
    if (!href) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }

  linkPromptRef.current = setLink;

  async function onImageSelected(file: File | null) {
    if (!file || !editor) return;
    if (!user) {
      setStatus("Sign in to upload images");
      return;
    }
    try {
      setStatus("Uploading image…");
      const uploaded = await uploadToDimDrive(user.uid, file, "WriteSpace");
      editor
        .chain()
        .focus()
        .setCaptionedImage({ src: uploaded.downloadURL, caption: file.name.replace(/\.[^.]+$/, "") })
        .run();
      setStatus("Image added");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Image upload failed");
    }
  }

  function exportMarkdown() {
    if (!editor) return;
    const html = editor.getHTML();
    const text = editor.getText();
    const md = `# ${title || "Untitled"}\n\n${subtitle ? `*${subtitle}*\n\n` : ""}${text}`;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(title || "writespace").replace(/[^\w\-]+/g, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    void html;
  }

  function exportHtml() {
    if (!editor) return;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title || "WriteSpace"}</title></head><body><article><h1>${title || "Untitled"}</h1>${subtitle ? `<p><em>${subtitle}</em></p>` : ""}${editor.getHTML()}</article></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(title || "writespace").replace(/[^\w\-]+/g, "-").toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const footnotes = useMemo(() => {
    if (!editor) return [] as { id: string; number: number; text: string }[];
    const notes: { id: string; number: number; text: string }[] = [];
    editor.state.doc.descendants((node) => {
      if (node.type.name === "footnote") {
        notes.push({
          id: String(node.attrs.id || ""),
          number: Number(node.attrs.number || notes.length + 1),
          text: String(node.attrs.text || "")
        });
      }
    });
    return notes.sort((a, b) => a.number - b.number);
  }, [editor, words, status]);

  const canvasClass = [
    "ws-canvas",
    mode === "word" ? "mode-word" : "mode-substack",
    preview === "mobile" ? "preview-mobile" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="ws-shell">
      <WriteSpaceStyles />
      <header className="ws-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span className="ws-brand">WriteSpace</span>
          <button type="button" className={`ws-mode ${mode === "substack" ? "active" : ""}`} onClick={() => setMode("substack")}>
            Substack View
          </button>
          <button type="button" className={`ws-mode ${mode === "word" ? "active" : ""}`} onClick={() => setMode("word")}>
            Word View
          </button>
          <span className="ws-meta">
            {words} words · {readingMinutes(words)} min read
          </span>
          <span className="ws-status">{status}{user ? "" : " · sign in for cloud sync"}</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className={`ws-chip ${preview !== "off" ? "active" : ""}`}
            onClick={() => setPreview((value) => (value === "off" ? "desktop" : value === "desktop" ? "mobile" : "off"))}
          >
            Preview {preview === "off" ? "" : `· ${preview}`}
          </button>
          <button type="button" className="ws-chip" onClick={exportMarkdown}>
            Export MD
          </button>
          <button type="button" className="ws-chip" onClick={exportHtml}>
            Export HTML
          </button>
          <button type="button" className="ws-btn-primary" onClick={() => editor && scheduleSave(editor.getJSON(), editor.getHTML(), editor.getText())}>
            Save now
          </button>
        </div>
      </header>

      <div className="ws-toolbar">
        <button type="button" className={`ws-chip ${editor?.isActive("bold") ? "active" : ""}`} onClick={() => editor?.chain().focus().toggleBold().run()}>
          Bold
        </button>
        <button type="button" className={`ws-chip ${editor?.isActive("italic") ? "active" : ""}`} onClick={() => editor?.chain().focus().toggleItalic().run()}>
          Italic
        </button>
        <button type="button" className={`ws-chip ${editor?.isActive("strike") ? "active" : ""}`} onClick={() => editor?.chain().focus().toggleStrike().run()}>
          Strike
        </button>
        <button type="button" className={`ws-chip ${editor?.isActive("code") ? "active" : ""}`} onClick={() => editor?.chain().focus().toggleCode().run()}>
          Code
        </button>
        <button type="button" className={`ws-chip ${editor?.isActive("heading", { level: 1 }) ? "active" : ""}`} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}>
          H1
        </button>
        <button type="button" className={`ws-chip ${editor?.isActive("heading", { level: 2 }) ? "active" : ""}`} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
          H2
        </button>
        <button type="button" className="ws-chip" onClick={setLink}>
          Link
        </button>
        <button type="button" className="ws-chip" onClick={() => editor?.chain().focus().setPullQuote().run()}>
          Pull quote
        </button>
        <button type="button" className="ws-chip" onClick={() => editor?.chain().focus().insertFootnote().run()}>
          Footnote
        </button>
        <button type="button" className="ws-chip" onClick={() => fileInput.current?.click()}>
          Image
        </button>
        <button type="button" className="ws-chip" onClick={() => editor?.chain().focus().setCtaButton().run()}>
          CTA
        </button>
        <button type="button" className="ws-chip" onClick={() => editor?.chain().focus().setPaywallDivider().run()}>
          Paywall
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            void onImageSelected(event.target.files?.[0] || null);
            event.target.value = "";
          }}
        />
      </div>

      <div className="ws-scroll">
        <div className="ws-canvas-wrap">
          <div className={canvasClass}>
            <input
              className="ws-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={mode === "word" ? "Document title" : "Post title"}
            />
            <input
              className="ws-subtitle"
              value={subtitle}
              onChange={(event) => setSubtitle(event.target.value)}
              placeholder={mode === "word" ? "Subtitle or deck" : "Subtitle for curious readers"}
            />
            {editor ? (
              <>
                <BubbleMenu editor={editor} options={{ placement: "top" }} className="ws-bubble">
                  <button type="button" className={`ws-chip ${editor.isActive("bold") ? "active" : ""}`} onClick={() => editor.chain().focus().toggleBold().run()}>
                    Bold
                  </button>
                  <button type="button" className={`ws-chip ${editor.isActive("italic") ? "active" : ""}`} onClick={() => editor.chain().focus().toggleItalic().run()}>
                    Italic
                  </button>
                  <button type="button" className={`ws-chip ${editor.isActive("strike") ? "active" : ""}`} onClick={() => editor.chain().focus().toggleStrike().run()}>
                    Strike
                  </button>
                  <button type="button" className={`ws-chip ${editor.isActive("code") ? "active" : ""}`} onClick={() => editor.chain().focus().toggleCode().run()}>
                    Code
                  </button>
                  <button type="button" className={`ws-chip ${editor.isActive("heading", { level: 2 }) ? "active" : ""}`} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                    H2
                  </button>
                  <button type="button" className="ws-chip" onClick={setLink}>
                    Link
                  </button>
                </BubbleMenu>
                <div className="ws-editor">
                  <EditorContent editor={editor} />
                </div>
              </>
            ) : null}
            {footnotes.length ? (
              <div className="ws-footnotes">
                <strong>Footnotes</strong>
                <ol>
                  {footnotes.map((note) => (
                    <li key={note.id || note.number} id={`fn-${note.id || note.number}`}>
                      {note.text || "Empty footnote"}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
