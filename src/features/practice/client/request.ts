import type { User } from "firebase/auth";

export async function request(
  user: User,
  signal: AbortSignal,
  url: string,
  init: RequestInit = {},
) {
  const token = await user.getIdToken();
  if (signal.aborted) throw new DOMException("Request aborted", "AbortError");
  return fetch(url, {
    ...init,
    signal,
    cache: "no-store",
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });
}
