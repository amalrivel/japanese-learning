import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { User } from "firebase/auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Drive provider effects/state in Node; render its real context and boundary with React DOM.
const harness = vi.hoisted(() => ({
  rendering: false,
  index: 0,
  states: [] as unknown[],
  effects: [] as (() => void | (() => void))[],
  onUser: undefined as ((user: User | null) => void) | undefined,
}));
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return {
    ...react,
    useState(initial: unknown) {
      if (!harness.rendering) return react.useState(initial);
      const index = harness.index++;
      if (!(index in harness.states)) harness.states[index] = initial;
      return [
        harness.states[index],
        (value: unknown) => {
          harness.states[index] = value;
        },
      ];
    },
    useEffect(effect: () => void | (() => void), deps: unknown[]) {
      if (!harness.rendering) return react.useEffect(effect, deps);
      harness.effects.push(effect);
    },
    useMemo(factory: () => unknown, deps: unknown[]) {
      return harness.rendering ? factory() : react.useMemo(factory, deps);
    },
  };
});
vi.mock("firebase/app", () => ({
  getApps: vi.fn(() => []),
  getApp: vi.fn(),
  initializeApp: vi.fn(() => ({})),
}));
vi.mock("firebase/auth", () => ({
  browserSessionPersistence: { type: "SESSION" },
  getAuth: vi.fn(() => ({})),
  setPersistence: vi.fn(async () => {}),
  connectAuthEmulator: vi.fn(),
  onAuthStateChanged: vi.fn((_auth, callback) => {
    harness.onUser = callback;
    return vi.fn();
  }),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick }: { children: ReactNode; onClick: () => void }) =>
    createElement("button", { onClick }, children),
}));

async function mount() {
  const { AuthProvider, useAuth } = await import("@/lib/auth/client");
  const { AuthBoundary } = await import("@/components/auth-boundary");
  let auth: ReturnType<typeof useAuth>;
  let boundaryKey: string | null = null;
  function Workspace() {
    auth = useAuth();
    const boundary = AuthBoundary({ children: createElement("p", null, "Private workspace") });
    boundaryKey = boundary.key;
    return boundary;
  }
  function render() {
    harness.index = 0;
    harness.rendering = true;
    let element;
    try {
      element = AuthProvider({ children: createElement(Workspace) });
    } finally {
      harness.rendering = false;
    }
    return renderToStaticMarkup(element);
  }
  const initial = render();
  const cleanup = harness.effects[0]();
  await new Promise((resolve) => setTimeout(resolve, 0));
  return { initial, render, cleanup, auth: () => auth!, key: () => boundaryKey };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  harness.states = [];
  harness.effects = [];
  harness.onUser = undefined;
  vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "demo-learning-pwa");
  vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "fake-api-key");
  vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "demo-learning-pwa.firebaseapp.com");
  vi.stubEnv("NEXT_PUBLIC_FIREBASE_APP_ID", "1:123:web:demo");
  vi.stubEnv("NEXT_PUBLIC_USE_FIREBASE_EMULATORS", "true");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("client auth regressions", () => {
  it("ends loading and renders a safe configuration alert for empty public config", async () => {
    for (const name of [
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
      "NEXT_PUBLIC_FIREBASE_API_KEY",
      "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
      "NEXT_PUBLIC_FIREBASE_APP_ID",
    ])
      vi.stubEnv(name, "");
    const view = await mount();
    expect(view.initial).toContain("Checking sign-in");
    const html = view.render();
    expect(html).not.toContain("Checking sign-in");
    expect(html).not.toContain("Private workspace");
    expect(html).toContain('role="alert">Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID.');
    expect(view.auth().loading).toBe(false);
    const { initializeApp } = await import("firebase/app");
    expect(initializeApp).not.toHaveBeenCalled();
    view.cleanup?.();
  });

  it("shares one initialization and waits for browser-session persistence", async () => {
    const sdk = await import("firebase/auth");
    let persisted!: () => void;
    vi.mocked(sdk.setPersistence).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          persisted = resolve;
        }),
    );
    const { getFirebaseAuth } = await import("@/lib/firebase/client");
    const first = getFirebaseAuth();
    expect(getFirebaseAuth()).toBe(first);
    let ready = false;
    void first.then(() => {
      ready = true;
    });
    await Promise.resolve();
    expect(ready).toBe(false);
    persisted();
    await expect(first).resolves.toBeDefined();
    expect(sdk.setPersistence).toHaveBeenCalledExactlyOnceWith(
      expect.anything(),
      sdk.browserSessionPersistence,
    );
    expect(sdk.connectAuthEmulator).toHaveBeenCalledOnce();
  });

  it("shows failed sign-out while signed in, changes the UID key, and removes private UI after success", async () => {
    const view = await mount();
    harness.onUser!({ uid: "learner-a", email: "a@example.test" } as User);
    expect(view.render()).toContain("Private workspace");
    expect(view.key()).toBe("learner-a");
    const sdk = await import("firebase/auth");
    vi.mocked(sdk.signOut).mockRejectedValueOnce(new Error("private SDK detail"));
    await view.auth().signOutUser();
    const failed = view.render();
    expect(failed).toContain('role="alert">Sign-out failed. Try again.');
    expect(failed).toContain("Private workspace");
    expect(failed).not.toContain("private SDK detail");
    expect(view.auth().user?.uid).toBe("learner-a");
    harness.onUser!({ uid: "learner-b", email: "b@example.test" } as User);
    expect(view.render()).not.toContain("a@example.test");
    expect(view.key()).toBe("learner-b");
    vi.mocked(sdk.signOut).mockImplementationOnce(async () => {
      harness.onUser!(null);
    });
    await view.auth().signOutUser();
    const signedOut = view.render();
    expect(signedOut).not.toContain("Private workspace");
    expect(signedOut).toContain("Sign in to continue");
    expect(signedOut).not.toContain('role="alert"');
    view.cleanup?.();
  });
});
