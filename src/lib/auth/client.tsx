"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { ConfigurationError } from "@/lib/firebase/config";
import { getFirebaseAuth } from "@/lib/firebase/client";

type AuthState = {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    getFirebaseAuth()
      .then((auth) => {
        const stop = onAuthStateChanged(auth, (nextUser) => {
          if (active) {
            setUser(nextUser);
            setLoading(false);
            setError(null);
          }
        });
        if (active) unsubscribe = stop;
        else stop();
      })
      .catch((reason: unknown) => {
        if (active) {
          setLoading(false);
          setError(
            reason instanceof ConfigurationError
              ? reason.message
              : "Firebase sign-in is unavailable.",
          );
        }
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      error,
      async signIn() {
        setError(null);
        try {
          const auth = await getFirebaseAuth();
          await signInWithPopup(auth, new GoogleAuthProvider());
        } catch (reason) {
          setError(
            reason instanceof ConfigurationError
              ? reason.message
              : "Google sign-in failed. Try again.",
          );
        }
      },
      async signOutUser() {
        setError(null);
        try {
          await signOut(await getFirebaseAuth());
        } catch {
          setError("Sign-out failed. Try again.");
        }
      },
    }),
    [user, loading, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}
