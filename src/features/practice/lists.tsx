"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/client";
import { request } from "./request";

type Item = {
  id: string;
  title?: string;
  packTitle?: string;
  status?: string;
  exerciseCount?: number;
  packId?: string;
};
function List({ history }: { history: boolean }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [filterInput, setFilterInput] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const controller = useRef<AbortController | null>(null);
  const load = useCallback(
    async (next: string | null) => {
      if (!user) return;
      controller.current?.abort();
      const current = new AbortController();
      controller.current = current;
      setStatus("loading");
      try {
        const params = new URLSearchParams();
        if (next) params.set("cursor", next);
        if (history && filter) params.set("packId", filter);
        const response = await request(
          user,
          current.signal,
          `/api/${history ? "attempts" : "packs"}${params.size ? `?${params}` : ""}`,
        );
        if (!response.ok) throw new Error("List unavailable");
        const data = (await response.json()) as { items: Item[]; nextCursor: string | null };
        if (current.signal.aborted) return;
        setItems((previous) => (next ? [...previous, ...data.items] : data.items));
        setCursor(data.nextCursor);
        setStatus("ready");
      } catch {
        if (!current.signal.aborted) setStatus("error");
      }
    },
    [user, history, filter],
  );
  useEffect(() => {
    const timer = window.setTimeout(() => void load(null), 0);
    return () => {
      window.clearTimeout(timer);
      controller.current?.abort();
    };
  }, [load]);
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-6 py-16">
      <h1 className="text-3xl font-semibold">{history ? "History" : "Practice"}</h1>
      <Link className="underline underline-offset-4" href="/">
        Home
      </Link>
      {history && (
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const next = filterInput.trim();
            setItems([]);
            setCursor(null);
            setStatus("loading");
            if (next === filter) void load(null);
            else setFilter(next);
          }}
        >
          <div>
            <label htmlFor="pack-filter" className="block">
              Filter by pack ID
            </label>
            <input
              id="pack-filter"
              className="rounded-md border bg-background p-2"
              value={filterInput}
              onChange={(event) => setFilterInput(event.target.value)}
            />
          </div>
          <Button type="submit" variant="outline">
            Apply filter
          </Button>
        </form>
      )}
      {items.length === 0 && status === "ready" && (
        <p>{history ? "No attempts yet." : "No packs yet. Import a learning pack to start."}</p>
      )}
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-lg border p-4">
            <a
              className="font-medium underline underline-offset-4"
              href={history ? `/history/${item.id}` : `/practice/${item.id}`}
            >
              {item.packTitle ?? item.title}
            </a>
            <p className="text-sm text-muted-foreground">
              {history ? item.status?.replaceAll("_", " ") : `${item.exerciseCount} questions`}
              {" · "}Pack ID: {item.packId ?? item.id}
            </p>
          </li>
        ))}
      </ul>
      {status === "loading" && <p role="status">Loading…</p>}
      {status === "error" && (
        <div role="alert">
          <p>Could not load {history ? "history" : "packs"}.</p>
          <Button variant="outline" onClick={() => void load(items.length ? cursor : null)}>
            Retry
          </Button>
        </div>
      )}
      {status === "ready" && cursor && (
        <Button variant="outline" onClick={() => void load(cursor)}>
          Load more
        </Button>
      )}
    </main>
  );
}
export function PracticeList() {
  return <List history={false} />;
}
export function HistoryList() {
  return <List history />;
}
