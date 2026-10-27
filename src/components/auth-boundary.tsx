"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

export function AuthBoundary({ children }: { children: React.ReactNode }) {
  const { user, loading, error, signOutUser } = useAuth();
  if (loading)
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16" role="status">
        Checking sign-in…
      </main>
    );
  if (!user) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <h1 className="text-2xl font-semibold">Sign in to continue</h1>
        <p className="mt-3 text-muted-foreground">
          Learning data is available to approved accounts only.
        </p>
        {error && (
          <p className="mt-3 text-destructive" role="alert">
            {error}
          </p>
        )}
        <Link className="mt-5 inline-block underline underline-offset-4" href="/sign-in">
          Continue to sign in
        </Link>
      </main>
    );
  }
  return (
    <div key={user.uid} className="flex min-h-full flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-end gap-3 px-6 pt-5 text-sm">
        <span>{user.email ?? "Signed in"}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (window.dispatchEvent(new Event("learning:signout", { cancelable: true })))
              void signOutUser();
          }}
        >
          Sign out
        </Button>
      </div>
      {error && (
        <p className="mx-auto mt-3 w-full max-w-3xl px-6 text-destructive" role="alert">
          {error}
        </p>
      )}
      {children}
    </div>
  );
}
