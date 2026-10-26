import { ImportForm } from "@/features/content/import-form";
export const instant = false;
export default function ImportPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <ImportForm />
    </main>
  );
}
