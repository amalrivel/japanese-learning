"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { WorkspaceNav } from "@/components/workspace-nav";

export function AuthBoundary({ children }: { children: React.ReactNode }) {
  const { user, loading, error, signOutUser } = useAuth();
  if (loading)
    return (
      <main className="learning-page" role="status">
        Checking sign-in…
      </main>
    );
  if (!user) {
    return (
      <main className="learning-page flex min-h-dvh flex-col justify-center">
        <section className="mx-auto w-full max-w-lg rounded-3xl border bg-card p-6 shadow-sm sm:p-10">
          <p className="mb-4 text-sm font-medium text-muted-foreground">Personalized Learning</p>
          <h1 className="text-3xl font-semibold tracking-tight">Sign in to continue</h1>
          <p className="mt-3 text-muted-foreground">
            Learning data is available to approved accounts only.
          </p>
          {error && (
            <p className="mt-3 text-destructive" role="alert">
              {error}
            </p>
          )}
          <Link className={buttonVariants({ className: "mt-6 w-full" })} href="/sign-in">
            Continue to sign in
          </Link>
        </section>
      </main>
    );
  }
  return (
    <div key={user.uid} className="flex min-h-full flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-end gap-3 px-4 pt-5 text-sm sm:px-8">
        <span className="min-w-0 truncate text-muted-foreground">{user.email ?? "Signed in"}</span>
        <Button
          className="min-h-11 shrink-0"
          variant="outline"
          size="sm"
          onClick={() => void signOutUser()}
        >
          Sign out
        </Button>
      </div>
      <WorkspaceNav />
      {error && (
        <p className="mx-auto mt-3 w-full max-w-3xl px-6 text-destructive" role="alert">
          {error}
        </p>
      )}
      {children}
    </div>
  );
}
