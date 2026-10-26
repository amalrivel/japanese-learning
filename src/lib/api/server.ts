import "server-only";

import { ConfigurationError } from "@/lib/firebase/config";
import { getFirebaseAdmin } from "@/lib/firebase/admin";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store",
  Vary: "Authorization",
};

export function apiJson(data: unknown, status = 200) {
  return Response.json(data, { status, headers: PRIVATE_HEADERS });
}

export function apiError(status: number, code: string, message: string) {
  return apiJson({ error: { code, message } }, status);
}

export function methodNotAllowed() {
  return apiError(405, "METHOD_NOT_ALLOWED", "This method is not available for this endpoint.");
}

export async function authenticateRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer ([^\s]+)$/i);
  if (!match)
    return { response: apiError(401, "UNAUTHENTICATED", "A valid bearer token is required.") };

  try {
    const { auth, config } = getFirebaseAdmin();
    const decoded = await auth.verifyIdToken(match[1], true);
    if (!config.allowedUids.includes(decoded.uid)) {
      return { response: apiError(403, "FORBIDDEN", "This account is not approved.") };
    }
    return { uid: decoded.uid };
  } catch (error) {
    if (error instanceof ConfigurationError) {
      return { response: apiError(503, "UNAVAILABLE", "Authentication is not configured.") };
    }
    return {
      response: apiError(401, "UNAUTHENTICATED", "The bearer token is invalid or expired."),
    };
  }
}

export function checkSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const requestUrl = new URL(request.url);
    const host = request.headers.get("host");
    if (!host || /[\s/@\\?#]/.test(host)) return false;
    return (
      origin === new URL(origin).origin &&
      origin === new URL(`${requestUrl.protocol}//${host}`).origin
    );
  } catch {
    return false;
  }
}

export async function withAuthenticatedUser(
  request: Request,
  handler: (uid: string) => Response | Promise<Response>,
) {
  if (request.method !== "GET" && !checkSameOrigin(request)) {
    return apiError(403, "FORBIDDEN", "Cross-origin requests are not allowed.");
  }
  const result = await authenticateRequest(request);
  if ("response" in result) return result.response;
  try {
    return await handler(result.uid);
  } catch {
    return apiError(500, "INTERNAL", "The request could not be completed.");
  }
}

export async function readJson(request: Request, maxBytes: number) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") ?? "")) {
    return {
      response: apiError(415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type must be application/json."),
    };
  }
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return { response: apiError(413, "PAYLOAD_TOO_LARGE", "The request body is too large.") };
  }
  if (!request.body)
    return { response: apiError(400, "INVALID_JSON", "A JSON request body is required.") };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return { response: apiError(413, "PAYLOAD_TOO_LARGE", "The request body is too large.") };
      }
      chunks.push(value);
    }
  } catch {
    return { response: apiError(400, "INVALID_JSON", "The request body could not be read.") };
  }
  try {
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return {
      value: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown,
    };
  } catch {
    return {
      response: apiError(400, "INVALID_JSON", "The request body must contain valid UTF-8 JSON."),
    };
  }
}
