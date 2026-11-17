"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  setDoc,
  type Firestore
} from "firebase/firestore";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBullSLn4jN1Q26-AatuBmuP_yIv9ugEkc",
  authDomain: "dimad-b463c.firebaseapp.com",
  projectId: "dimad-b463c",
  storageBucket: "dimad-b463c.firebasestorage.app",
  messagingSenderId: "123269277660",
  appId: "1:123269277660:web:2cfa4e826adf1c1e555119",
  measurementId: "G-G04BWQMK7E"
};

export type WriteMode = "substack" | "word";

export type WritingDoc = {
  id: string;
  title: string;
  subtitle: string;
  mode: WriteMode;
  contentHtml: string;
  contentJson: unknown;
  wordCount: number;
  updatedAt: number;
  createdAt: number;
};

function firebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

function database(): Firestore {
  return getFirestore(firebaseApp());
}

export function getWritingsAuth(): Auth {
  return getAuth(firebaseApp());
}

export function newWritingId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `w_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function saveWriting(userId: string, writing: WritingDoc) {
  const ref = doc(database(), "users", userId, "writings", writing.id);
  await setDoc(
    ref,
    {
      title: writing.title,
      subtitle: writing.subtitle,
      mode: writing.mode,
      contentHtml: writing.contentHtml,
      contentJson: writing.contentJson ?? null,
      wordCount: writing.wordCount,
      updatedAt: writing.updatedAt,
      createdAt: writing.createdAt
    },
    { merge: true }
  );
}

export async function loadWriting(userId: string, docId: string): Promise<WritingDoc | null> {
  const snap = await getDoc(doc(database(), "users", userId, "writings", docId));
  if (!snap.exists()) return null;
  const data = snap.data() as Omit<WritingDoc, "id">;
  return { id: snap.id, ...data };
}

export async function listWritings(userId: string): Promise<WritingDoc[]> {
  const q = query(collection(database(), "users", userId, "writings"), orderBy("updatedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((row) => {
    const data = row.data() as Omit<WritingDoc, "id">;
    return { id: row.id, ...data };
  });
}

export function countWords(text: string) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return 0;
  return cleaned.split(" ").filter(Boolean).length;
}

export function readingMinutes(words: number) {
  return Math.max(1, Math.round(words / 200));
}
