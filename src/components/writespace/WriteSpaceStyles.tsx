"use client";

export default function WriteSpaceStyles() {
  return (
    <style>{`
      .ws-shell {
        height: 100vh;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        background: #070A0F;
        color: #e2e8f0;
        font-family: Inter, ui-sans-serif, system-ui, sans-serif;
      }
      .ws-header, .ws-toolbar {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        border-bottom: 1px solid #1E293B;
        background: #0B0F17;
        flex-wrap: wrap;
        flex-shrink: 0;
        z-index: 20;
      }
      .ws-header { justify-content: space-between; position: sticky; top: 0; }
      .ws-toolbar { position: sticky; top: 0; }
      .ws-brand {
        color: #F59E0B;
        font-family: "JetBrains Mono", ui-monospace, monospace;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.04em;
      }
      .ws-meta { color: #94a3b8; font-size: 11px; }
      .ws-btn, .ws-chip, .ws-mode {
        background: #070A0F;
        color: #e2e8f0;
        border: 1px solid #1E293B;
        border-radius: 8px;
        padding: 6px 10px;
        font-size: 11px;
        cursor: pointer;
      }
      .ws-btn:hover, .ws-chip:hover, .ws-mode:hover { border-color: #F59E0B; color: #F59E0B; }
      .ws-btn.active, .ws-chip.active, .ws-mode.active {
        background: rgba(245, 158, 11, 0.12);
        border-color: #F59E0B;
        color: #F59E0B;
      }
      .ws-btn-primary {
        background: #F59E0B;
        color: #0f172a;
        border: 0;
        border-radius: 8px;
        padding: 6px 12px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
      }
      .ws-scroll {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: #334155 transparent;
      }
      .ws-canvas-wrap {
        padding: 24px 16px 64px;
        display: flex;
        justify-content: center;
      }
      .ws-canvas {
        width: 100%;
        max-width: 720px;
        background: #0B0F17;
        border: 1px solid #1E293B;
        border-radius: 16px;
        padding: 28px 28px 48px;
        box-shadow: 0 20px 50px rgba(0,0,0,0.35);
      }
      .ws-canvas.mode-word {
        max-width: 816px;
        min-height: 1056px;
        background: #ffffff;
        color: #111827;
        border-radius: 2px;
        box-shadow: 0 12px 40px rgba(0,0,0,0.45);
      }
      .ws-canvas.preview-mobile { max-width: 390px; }
      .ws-title, .ws-subtitle {
        width: 100%;
        background: transparent;
        border: 0;
        outline: none;
        color: inherit;
      }
      .ws-title {
        font-size: 34px;
        font-weight: 800;
        line-height: 1.15;
        margin-bottom: 8px;
      }
      .ws-subtitle {
        font-size: 18px;
        color: #94a3b8;
        margin-bottom: 22px;
      }
      .ws-canvas.mode-word .ws-subtitle { color: #6b7280; }
      .ws-editor .ProseMirror {
        min-height: 420px;
        outline: none;
        font-size: 18px;
        line-height: 1.7;
        font-family: Georgia, "Times New Roman", serif;
      }
      .ws-canvas.mode-word .ProseMirror {
        font-size: 11pt;
        line-height: 1.25;
        font-family: Calibri, Arial, sans-serif;
      }
      .ws-editor .ProseMirror p { margin: 0 0 1em; }
      .ws-editor .ProseMirror h1, .ws-editor .ProseMirror h2, .ws-editor .ProseMirror h3 {
        line-height: 1.25;
        margin: 1.2em 0 0.5em;
        font-weight: 700;
      }
      .ws-editor .ProseMirror h1 { font-size: 1.8em; }
      .ws-editor .ProseMirror h2 { font-size: 1.4em; }
      .ws-editor .ProseMirror h3 { font-size: 1.2em; }
      .ws-editor .ProseMirror blockquote {
        border-left: 3px solid #F59E0B;
        margin: 1em 0;
        padding-left: 1em;
        color: #cbd5e1;
      }
      .ws-canvas.mode-word .ProseMirror blockquote { color: #374151; }
      .ws-pull-quote {
        border: 0 !important;
        text-align: center;
        font-size: 1.35em;
        font-style: italic;
        color: #F59E0B;
        margin: 1.6em 0;
        padding: 0.4em 1em;
      }
      .ws-canvas.mode-word .ws-pull-quote { color: #b45309; }
      .ws-footnote {
        color: #F59E0B;
        font-size: 0.75em;
        cursor: pointer;
      }
      .ws-figure { margin: 1.4em 0; }
      .ws-figure.is-selected { outline: 1px solid #F59E0B; border-radius: 12px; }
      .ws-figure-img { width: 100%; border-radius: 10px; display: block; }
      .ws-figure-caption {
        margin-top: 0.45em;
        text-align: center;
        font-size: 0.85em;
        color: #94a3b8;
        outline: none;
      }
      .ws-cta { margin: 1.4em 0; text-align: center; }
      .ws-cta-link {
        display: inline-block;
        background: #F59E0B;
        color: #0f172a;
        text-decoration: none;
        font-weight: 700;
        border-radius: 999px;
        padding: 10px 18px;
      }
      .ws-paywall {
        margin: 1.8em 0;
        border-top: 1px dashed #F59E0B;
        position: relative;
        height: 28px;
      }
      .ws-paywall-label {
        position: absolute;
        left: 50%;
        top: -0.7em;
        transform: translateX(-50%);
        background: #0B0F17;
        color: #F59E0B;
        font-size: 11px;
        padding: 0 8px;
        white-space: nowrap;
      }
      .ws-canvas.mode-word .ws-paywall-label { background: #fff; }
      .ws-editor .ProseMirror pre {
        background: #020617;
        border: 1px solid #1E293B;
        border-radius: 10px;
        padding: 12px;
        overflow-x: auto;
        font-size: 0.9em;
      }
      .ws-editor .ProseMirror code {
        font-family: "JetBrains Mono", ui-monospace, monospace;
        font-size: 0.9em;
      }
      .ws-editor .ProseMirror hr {
        border: 0;
        border-top: 1px solid #334155;
        margin: 1.5em 0;
      }
      .ws-bubble, .ws-slash {
        display: flex;
        gap: 4px;
        padding: 6px;
        background: #0B0F17;
        border: 1px solid #1E293B;
        border-radius: 10px;
        box-shadow: 0 12px 30px rgba(0,0,0,0.45);
      }
      .ws-slash {
        flex-direction: column;
        min-width: 220px;
        padding: 6px;
      }
      .ws-slash button {
        text-align: left;
        background: transparent;
        border: 0;
        color: #e2e8f0;
        padding: 8px 10px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 12px;
      }
      .ws-slash button:hover, .ws-slash button.is-selected {
        background: rgba(245, 158, 11, 0.12);
        color: #F59E0B;
      }
      .ws-footnotes {
        margin-top: 32px;
        padding-top: 16px;
        border-top: 1px solid #1E293B;
        font-size: 13px;
        color: #94a3b8;
      }
      .ws-footnotes ol { margin: 0; padding-left: 1.2em; }
      .ws-footnotes li { margin: 0.35em 0; }
      .ws-status { color: #64748b; font-size: 11px; }
    `}</style>
  );
}
