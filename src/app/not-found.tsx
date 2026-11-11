import Link from "next/link";
import { BookOpen } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="learning-page flex min-h-dvh flex-col items-center justify-center text-center">
      <BookOpen className="mb-6 size-12 rounded-2xl bg-muted p-3" aria-hidden="true" />
      <p className="mb-3 text-sm font-medium text-muted-foreground">
        404 · Halaman tidak ditemukan
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">Kembali ke ruang belajarmu.</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Halaman ini mungkin sudah dipindahkan atau alamatnya belum tepat.
      </p>
      <Link href="/" className={buttonVariants({ className: "mt-6" })}>
        Kembali ke beranda
      </Link>
    </main>
  );
}
