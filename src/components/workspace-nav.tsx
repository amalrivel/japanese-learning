"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, Home, ChartNoAxesCombined, History } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";

export function WorkspaceNav() {
  const pathname = usePathname();
  const [hash, setHash] = useState("");
  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, [pathname]);
  return (
    <nav
      aria-label="Navigasi utama"
      className="mx-auto flex w-full max-w-5xl items-center gap-2 px-4 pt-4 sm:px-8"
    >
      <div className="grid min-w-0 flex-1 grid-cols-4 gap-1 rounded-2xl border bg-card p-1 sm:flex">
        {[
          ["/", "Utama", Home],
          ["/manual", "Belajar", BookOpen],
          ["/manual/works", "Pekerjaan", History],
          ["/#progres", "Progres", ChartNoAxesCombined],
        ].map(([href, label, Icon]) => {
          const active =
            `${pathname}${hash}` === href ||
            (href === "/manual" && pathname.startsWith("/manual/") && pathname !== "/manual/works");
          const NavIcon = Icon as typeof Home;
          return (
            <Link
              key={href as string}
              href={href as string}
              onClick={(event) => {
                if (
                  !window.dispatchEvent(new Event("learning:before-navigate", { cancelable: true }))
                )
                  event.preventDefault();
                else
                  setHash(
                    (href as string).includes("#") ? `#${(href as string).split("#")[1]}` : "",
                  );
              }}
              aria-current={active ? "page" : undefined}
              className={buttonVariants({
                variant: active ? "secondary" : "ghost",
                className:
                  "min-h-12 flex-col gap-1 px-2 text-xs sm:flex-row sm:gap-2 sm:px-4 sm:text-sm",
              })}
            >
              <NavIcon className="size-4" aria-hidden="true" />
              {label as string}
            </Link>
          );
        })}
      </div>
      <ModeToggle />
    </nav>
  );
}
