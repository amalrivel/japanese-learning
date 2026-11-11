import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: (destination: string) => {
    throw new Error(`redirect:${destination}`);
  },
}));

describe("latest learning navigation", () => {
  it.each([
    ["practice", () => import("../../src/app/(learner)/practice/page"), "/manual"],
    ["practice detail", () => import("../../src/app/(learner)/practice/[packId]/page"), "/manual"],
    ["history", () => import("../../src/app/(learner)/history/page"), "/manual/works"],
    [
      "history detail",
      () => import("../../src/app/(learner)/history/[attemptId]/page"),
      "/manual/works",
    ],
    ["progress", () => import("../../src/app/(learner)/progress/page"), "/"],
    ["import", () => import("../../src/app/(management)/import/page"), "/manual/import"],
    ["teacher", () => import("../../src/app/(management)/teacher/report/page"), "/manual/teacher"],
  ] as const)("redirects %s to the latest flow", async (_, load, destination) => {
    const page = await load();
    expect(() => page.default()).toThrow(`redirect:${destination}`);
  });
});
