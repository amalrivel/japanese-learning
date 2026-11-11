"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";

export function SignInForm() {
  const { user, loading, error, signIn } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);
  return (
    <main className="learning-page flex min-h-dvh max-w-lg flex-col justify-center">
      <div className="rounded-3xl border bg-card p-6 shadow-sm sm:p-10">
        <BookOpen className="mb-6 size-10 rounded-xl bg-muted p-2" aria-hidden="true" />
        <Link className="text-sm text-muted-foreground underline underline-offset-4" href="/">
          Learning workspace
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-3 text-muted-foreground">
          Use an approved Google account to access your learning workspace.
        </p>
        {loading ? (
          <p className="mt-6" role="status">
            Checking sign-in…
          </p>
        ) : user ? (
          <p className="mt-6" role="status">
            Mengalihkan ke beranda…
          </p>
        ) : (
          <Button className="mt-6 w-full" onClick={signIn}>
            Continue with Google
          </Button>
        )}
        {error && (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
