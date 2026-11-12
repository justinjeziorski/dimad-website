"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  increment,
  orderBy,
  query,
  setDoc,
  type Firestore
} from "firebase/firestore";
import { deleteObject, getDownloadURL, getStorage, ref, uploadBytesResumable, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBullSLn4jN1Q26-AatuBmuP_yIv9ugEkc",
  authDomain: "dimad-b463c.firebaseapp.com",
  projectId: "dimad-b463c",
  storageBucket: "dimad-b463c.firebasestorage.app",
  messagingSenderId: "123269277660",
  appId: "1:123269277660:web:2cfa4e826adf1c1e555119",
  measurementId: "G-G04BWQMK7E"
};

export type DimDriveFile = {
  id: string;
  name: string;
  storagePath: string;
  downloadURL: string;
  contentType: string;
  size: number;
  folderPath: string;
  createdAt: number;
};

function firebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

function bucket(): FirebaseStorage {
  return getStorage(firebaseApp());
}

function database(): Firestore {
  return getFirestore(firebaseApp());
}

export function getDimDriveAuth(): Auth {
  return getAuth(firebaseApp());
}

function userDoc(userId: string) {
  return doc(database(), "users", userId);
}

function fileDoc(userId: string, fileId: string) {
  return doc(database(), "users", userId, "files", fileId);
}

function asFile(row: Record<string, unknown>, id: string): DimDriveFile {
  return {
    id,
    name: String(row.name || "file"),
    storagePath: String(row.storagePath || ""),
    downloadURL: String(row.downloadURL || ""),
    contentType: String(row.contentType || "application/octet-stream"),
    size: Number(row.size || 0) || 0,
    folderPath: String(row.folderPath || ""),
    createdAt: Number(row.createdAt || 0) || 0
  };
}

export function uploadToDimDrive(userId: string, file: File, folderPath = ""): Promise<DimDriveFile> {
  const fileId = crypto.randomUUID();
  const safeName = file.name.replace(/[\\/]/g, "_");
  const storagePath = `dimdrive/${userId}/${fileId}_${safeName}`;
  const storageRef = ref(bucket(), storagePath);
  const task = uploadBytesResumable(storageRef, file, {
    contentType: file.type || "application/octet-stream"
  });

  return new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      () => {},
      reject,
      () => {
        void (async () => {
          const downloadURL = await getDownloadURL(task.snapshot.ref);
          const meta: DimDriveFile = {
            id: fileId,
            name: file.name,
            storagePath,
            downloadURL,
            contentType: file.type || "application/octet-stream",
            size: file.size,
            folderPath: folderPath || "",
            createdAt: Date.now()
          };
          await setDoc(fileDoc(userId, fileId), meta);
          await setDoc(userDoc(userId), { storage_used_bytes: increment(file.size) }, { merge: true });
          resolve(meta);
        })().catch(reject);
      }
    );
  });
}

export async function deleteFromDimDrive(userId: string, file: DimDriveFile): Promise<void> {
  if (file.storagePath) await deleteObject(ref(bucket(), file.storagePath));
  await deleteDoc(fileDoc(userId, file.id));
  await setDoc(userDoc(userId), { storage_used_bytes: increment(-Math.abs(file.size || 0)) }, { merge: true });
}

export async function listDimDriveFiles(userId: string): Promise<DimDriveFile[]> {
  const listed = query(collection(database(), "users", userId, "files"), orderBy("createdAt", "desc"));
  const snap = await getDocs(listed);
  return snap.docs.map((row) => asFile(row.data() as Record<string, unknown>, row.id));
}
