"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  deleteFromDimDrive,
  getDimDriveAuth,
  listDimDriveFiles,
  uploadToDimDrive,
  type DimDriveFile
} from "@/lib/dimdrive";

const FOLDER_KEY = "dimad_dimdrive_folders";

function readFolders(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(FOLDER_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map((name) => String(name)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(1)} GB`;
}

export default function DimDriveView() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [files, setFiles] = useState<DimDriveFile[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [folder, setFolder] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async (uid: string) => {
    const listed = await listDimDriveFiles(uid);
    setFiles(listed);
    setFolders((current) => {
      const names = new Set([...readFolders(), ...current, ...listed.map((file) => file.folderPath).filter(Boolean)]);
      const next = Array.from(names);
      localStorage.setItem(FOLDER_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    setFolders(readFolders());
    return onAuthStateChanged(getDimDriveAuth(), (next) => {
      setUser(next);
      setReady(true);
      if (next) void refresh(next.uid).catch((err) => setError(err instanceof Error ? err.message : "Could not load dimDrive."));
      else setFiles([]);
    });
  }, [refresh]);

  const visible = useMemo(
    () => files.filter((file) => (folder ? file.folderPath === folder : !file.folderPath)),
    [files, folder]
  );
  const used = files.reduce((sum, file) => sum + (file.size || 0), 0);

  async function onUpload(list: FileList | null, folderPath: string) {
    if (!user || !list?.length) return;
    setError("");
    setBusy("Uploading…");
    try {
      for (const file of Array.from(list)) {
        const path = folderPath || folder;
        await uploadToDimDrive(user.uid, file, path);
      }
      await refresh(user.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy("");
    }
  }

  async function onDelete(file: DimDriveFile) {
    if (!user) return;
    setError("");
    setBusy("Deleting…");
    try {
      await deleteFromDimDrive(user.uid, file);
      await refresh(user.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusy("");
    }
  }

  function createFolder() {
    const name = window.prompt("Folder name")?.trim();
    if (!name || folders.includes(name)) return;
    const next = folders.concat(name);
    setFolders(next);
    localStorage.setItem(FOLDER_KEY, JSON.stringify(next));
    setFolder(name);
  }

  return (
    <div style={shell}>
      <header style={header}>
        <strong>dimDrive</strong>
        <span style={{ color: "#94a3b8" }}>{busy || `${formatBytes(used)} stored`}</span>
      </header>
      {!ready ? <p style={muted}>Loading dimDrive…</p> : null}
      {ready && !user ? <p style={muted}>Sign in to store files in dimDrive.</p> : null}
      {error ? <p style={{ color: "#fb7185", margin: "12px 16px" }}>{error}</p> : null}
      {user ? (
        <div style={layout}>
          <aside style={aside}>
            <label style={button}>
              Upload file
              <input type="file" hidden onChange={(event) => void onUpload(event.target.files, folder)} />
            </label>
            <label style={{ ...button, background: "#0f172a", color: "#e2e8f0" }}>
              Upload folder
              <input
                type="file"
                hidden
                multiple
                {...{ webkitdirectory: "" }}
                onChange={(event) => {
                  const list = event.target.files;
                  if (!list?.length) return;
                  const group = list[0].webkitRelativePath.split("/")[0] || folder;
                  void onUpload(list, group);
                }}
              />
            </label>
            <button type="button" style={{ ...button, background: "#0f172a", color: "#fbbf24" }} onClick={createFolder}>
              New folder
            </button>
            <button type="button" style={navBtn(folder === "")} onClick={() => setFolder("")}>
              My Drive
            </button>
            {folders.map((name) => (
              <button key={name} type="button" style={navBtn(folder === name)} onClick={() => setFolder(name)}>
                {name}
              </button>
            ))}
          </aside>
          <main style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 16 }}>{folder || "My Drive"}</h2>
            {!visible.length ? (
              <div style={{ textAlign: "center", padding: "48px 20px", border: "1px dashed #334155", borderRadius: 16, background: "rgba(15, 23, 42, 0.5)" }}>
                <p style={{ margin: "0 0 6px", color: "#f8fafc", fontWeight: 700 }}>Your drive is empty</p>
                <p style={{ ...muted, marginTop: 0 }}>Upload a file or create a folder to store the first item in dimDrive.</p>
              </div>
            ) : null}
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
              {visible.map((file) => (
                <li key={file.id} style={row}>
                  <a href={file.downloadURL} target="_blank" rel="noreferrer" style={{ color: "#f8fafc", textDecoration: "none" }}>
                    {file.name}
                  </a>
                  <span style={muted}>{formatBytes(file.size)}</span>
                  <button type="button" style={danger} onClick={() => void onDelete(file)}>
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </main>
        </div>
      ) : null}
    </div>
  );
}

const shell: CSSProperties = {
  minHeight: "100vh",
  background: "#020617",
  color: "#e2e8f0",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
};
const header: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 16px",
  borderBottom: "1px solid #1e293b"
};
const layout: CSSProperties = { display: "flex", gap: 16, padding: 16, alignItems: "flex-start" };
const aside: CSSProperties = { width: 200, display: "grid", gap: 8 };
const button: CSSProperties = {
  display: "block",
  textAlign: "center",
  background: "#f59e0b",
  color: "#0f172a",
  borderRadius: 8,
  padding: "8px 10px",
  fontWeight: 700,
  cursor: "pointer"
};
const muted: CSSProperties = { color: "#94a3b8", fontSize: 12 };
const row: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto auto",
  gap: 12,
  alignItems: "center",
  padding: "10px 12px",
  border: "1px solid #1e293b",
  borderRadius: 8
};
const danger: CSSProperties = {
  background: "transparent",
  color: "#fb7185",
  border: "1px solid #fb7185",
  borderRadius: 6,
  padding: "4px 8px",
  cursor: "pointer"
};

function navBtn(active: boolean): CSSProperties {
  return {
    textAlign: "left",
    background: active ? "#1e293b" : "transparent",
    color: active ? "#fbbf24" : "#e2e8f0",
    border: "1px solid #1e293b",
    borderRadius: 8,
    padding: "8px 10px",
    cursor: "pointer"
  };
}
