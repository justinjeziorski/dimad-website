import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { collection, deleteDoc, doc, getDocs, increment, orderBy, query, setDoc } from "firebase/firestore";

function services() {
  const fb = window.DIMAD_FIREBASE;
  if (!fb?.app || !fb.db || !fb.storage) throw new Error("firebase_unavailable");
  return fb;
}

function asFile(row, id) {
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

export function uploadToDimDrive(userId, file, folderPath = "") {
  const { db, storage } = services();
  const fileId = crypto.randomUUID();
  const safeName = String(file.name || "file").replace(/[\\/]/g, "_");
  const storagePath = `dimdrive/${userId}/${fileId}_${safeName}`;
  const storageRef = ref(storage, storagePath);
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
          const meta = {
            id: fileId,
            name: file.name,
            storagePath,
            downloadURL,
            contentType: file.type || "application/octet-stream",
            size: file.size,
            folderPath: folderPath || "",
            createdAt: Date.now()
          };
          await setDoc(doc(db, "users", userId, "files", fileId), meta);
          await setDoc(doc(db, "users", userId), { storage_used_bytes: increment(file.size) }, { merge: true });
          resolve(meta);
        })().catch(reject);
      }
    );
  });
}

export async function deleteFromDimDrive(userId, file) {
  const { db, storage } = services();
  if (file?.storagePath) await deleteObject(ref(storage, file.storagePath));
  await deleteDoc(doc(db, "users", userId, "files", file.id));
  await setDoc(doc(db, "users", userId), { storage_used_bytes: increment(-Math.abs(file?.size || 0)) }, { merge: true });
}

export async function listDimDriveFiles(userId) {
  const { db } = services();
  const listed = query(collection(db, "users", userId, "files"), orderBy("createdAt", "desc"));
  const snap = await getDocs(listed);
  return snap.docs.map((row) => asFile(row.data(), row.id));
}

window.DIMAD_DIMDRIVE = { uploadToDimDrive, deleteFromDimDrive, listDimDriveFiles };
