import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  auth: { user: null as null | { uid: string }, loading: true, error: null, signIn: vi.fn() },
  router: { replace: vi.fn() },
  effects: [] as (() => void)[],
}));
vi.mock("@/lib/auth/client", () => ({ useAuth: () => state.auth }));
vi.mock("next/navigation", () => ({ useRouter: () => state.router }));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useEffect: (effect: () => void) => {
    state.effects.push(effect);
  },
}));
vi.mock("@/components/ui/button", () => ({
  Button: ({ children }: { children: ReactNode }) => createElement("button", null, children),
}));
import { SignInForm } from "@/components/sign-in-form";

beforeEach(() => {
  state.effects = [];
  state.router.replace.mockClear();
});
it.each([
  [true, null, false],
  [false, null, false],
  [true, { uid: "learner" }, false],
  [false, { uid: "learner" }, true],
] as const)("redirects only after login is confirmed (loading=%s)", (loading, user, redirect) => {
  state.auth.loading = loading;
  state.auth.user = user;
  const html = renderToStaticMarkup(createElement(SignInForm));
  state.effects.forEach((effect) => effect());
  if (redirect) {
    expect(state.router.replace).toHaveBeenCalledWith("/");
    expect(html).toContain("Mengalihkan ke beranda");
  } else expect(state.router.replace).not.toHaveBeenCalled();
});
