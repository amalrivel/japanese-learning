"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Home, PencilLine } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";

const links = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/manual/materials", label: "Belajar", icon: BookOpen },
  { href: "/manual/works", label: "Latihan", icon: PencilLine },
];

export function WorkspaceNav() {
  const pathname = usePathname();
  const practice = ["/manual/works", "/manual/study", "/manual/teacher"].includes(pathname);
  return (
    <nav
      aria-label="Navigasi utama"
      className="mx-auto flex w-full max-w-5xl items-center gap-2 px-4 pt-4 sm:px-8"
    >
      <div className="grid min-w-0 flex-1 grid-cols-3 gap-1 rounded-2xl border bg-card p-1 sm:flex">
        {links.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : href === "/manual/works"
                ? practice
                : pathname.startsWith("/manual") && !practice;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              onClick={(event) => {
                if (
                  !window.dispatchEvent(new Event("learning:before-navigate", { cancelable: true }))
                )
                  event.preventDefault();
              }}
              className={buttonVariants({
                variant: active ? "secondary" : "ghost",
                className:
                  "min-h-12 flex-col gap-1 px-2 text-xs sm:flex-row sm:gap-2 sm:px-4 sm:text-sm",
              })}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </div>
      <ModeToggle />
    </nav>
  );
}
