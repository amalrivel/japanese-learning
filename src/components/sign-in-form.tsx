"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

export function SignInForm() {
  const { user, loading, error, signIn, signOutUser } = useAuth();
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-16">
      <Link className="text-sm text-muted-foreground underline underline-offset-4" href="/">
        Learning workspace
      </Link>
      <h1 className="mt-6 text-3xl font-semibold">Sign in</h1>
      <p className="mt-3 text-muted-foreground">
        Use an approved Google account to access your learning workspace.
      </p>
      {loading ? (
        <p className="mt-6" role="status">
          Checking sign-in…
        </p>
      ) : user ? (
        <div className="mt-6 flex items-center gap-3">
          <p>Signed in as {user.email ?? "your account"}.</p>
          <Button variant="outline" onClick={signOutUser}>
            Sign out
          </Button>
        </div>
      ) : (
        <Button className="mt-6 w-fit" onClick={signIn}>
          Continue with Google
        </Button>
      )}
      {error && (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
