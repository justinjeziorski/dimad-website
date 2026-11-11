import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBullSLn4jN1Q26-AatuBmuP_yIv9ugEkc",
  authDomain: "dimad-b463c.firebaseapp.com",
  projectId: "dimad-b463c",
  storageBucket: "dimad-b463c.firebasestorage.app",
  messagingSenderId: "123269277660",
  appId: "1:123269277660:web:2cfa4e826adf1c1e555119",
  measurementId: "G-G04BWQMK7E"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let analytics = null;
try {
  analytics = getAnalytics(app);
} catch (err) {
  console.warn("Firebase Analytics unavailable", err);
}

window.DIMAD_FIREBASE = { app, analytics, auth, db };

export { app, analytics, auth, db };
