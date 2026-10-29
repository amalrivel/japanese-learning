import { ModeToggle } from "@/components/mode-toggle";

const routes = [
  ["Practice", "/practice"],
  ["History", "/history"],
  ["Progress", "/progress"],
  ["Import learning pack", "/import"],
  ["Teacher report", "/teacher/report"],
] as const;

// AuthBoundary waits for browser sign-in before rendering this page.
export const instant = false;

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Personalized Learning</p>
          <h1 className="mt-2 text-3xl font-semibold">Your learning workspace</h1>
          <p className="mt-3 text-muted-foreground">
            Import a learning pack, practice, and return to your saved drafts.
          </p>
        </div>
        <ModeToggle />
      </div>
      <nav aria-label="Learning workspace" className="grid gap-3 sm:grid-cols-2">
        {routes.map(([label, href]) => (
          <a key={href} className="rounded-lg border p-4 font-medium hover:bg-muted" href={href}>
            {label} <span aria-hidden="true">→</span>
          </a>
        ))}
      </nav>
    </main>
  );
}
