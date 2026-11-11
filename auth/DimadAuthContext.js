import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut } from "firebase/auth";
import { getDimadAuth, syncDimadLocalUser } from "./session.js";

const DimadAuthContext = createContext(null);

export function DimadAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getDimadAuth();
    const unsub = onAuthStateChanged(auth, (next) => {
      setUser(next);
      setLoading(false);
      if (next) syncDimadLocalUser(next);
    });
    return unsub;
  }, []);

  const signIn = useCallback(async (email, password) => {
    const cred = await signInWithEmailAndPassword(getDimadAuth(), email, password);
    syncDimadLocalUser(cred.user);
    return cred.user;
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(getDimadAuth());
    syncDimadLocalUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signOut }),
    [user, loading, signIn, signOut]
  );

  return createElement(DimadAuthContext.Provider, { value }, children);
}

export function useDimadAuth() {
  const ctx = useContext(DimadAuthContext);
  if (!ctx) {
    throw new Error("useDimadAuth must be used within DimadAuthProvider");
  }
  return ctx;
}
