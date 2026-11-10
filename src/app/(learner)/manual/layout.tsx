import { ManualLearning } from "@/features/practice/components/manual-learning";
import { Suspense } from "react";

export const instant = false;

export default function ManualLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense
        fallback={
          <main className="learning-page" role="status">
            Memuat ruang belajar…
          </main>
        }
      >
        <ManualLearning />
      </Suspense>
      {children}
    </>
  );
}
