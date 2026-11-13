import type { FileFn } from "@filefn/server";
import type { Hono } from "hono";
import { AuthFnError } from "authfn";
import { jsonError } from "authfn/http/envelopes";
import { ACCOUNT_FILES_BASE_PATH } from "./server.js";

/** Inputs for mounting FileFn on the account app. */
export interface RegisterAccountFileRoutesInput {
  /** Account Hono app to register the `/files` routes on. */
  app: Hono;
  /** Returns the region's FileFn, or null when file storage is not configured. */
  getFileFn: () => Promise<FileFn | null>;
}

const PROXY_PATH_PREFIX = `${ACCOUNT_FILES_BASE_PATH}/proxy/`;

/**
 * Headers on every `/files` response so stored bytes never run as active
 * content on the account origin: no MIME sniffing, and a sandboxed document
 * with no sources if a browser renders it anyway.
 */
export const FILE_RESPONSE_ISOLATION_HEADERS: Readonly<Record<string, string>> = {
  "x-content-type-options": "nosniff",
  "content-security-policy": "sandbox; default-src 'none'"
};

/**
 * Registers FileFn under `/files`. Requests return 503 when the region has no
 * file storage configured and 404 for paths FileFn does not serve. An AuthFn
 * error raised while resolving the session is answered with its AuthFn status,
 * code and details, as the AuthFn routes answer it. Every
 * response carries the isolation headers, and file bytes (the proxy download
 * routes and any non-JSON response) are sent as attachments.
 */
export function registerAccountFileRoutes(
  input: RegisterAccountFileRoutesInput
): void {
  const { app, getFileFn } = input;
  const handler = async (c: { req: { raw: Request } }) => {
    const request = c.req.raw;
    const fileFn = await getFileFn();
    if (!fileFn) {
      return isolateFileResponse(
        request,
        fileErrorResponse(
          503,
          "FILEFN_UNAVAILABLE",
          "File storage is not configured for this region"
        )
      );
    }
    let response: Response | null;
    try {
      response = await fileFn.router.handle(request);
    } catch (error) {
      if (!(error instanceof AuthFnError)) {
        throw error;
      }
      response = jsonError(request, error);
    }
    return isolateFileResponse(
      request,
      response ?? fileErrorResponse(404, "FILEFN_ROUTE_NOT_FOUND", "Not found")
    );
  };
  app.all(ACCOUNT_FILES_BASE_PATH, handler);
  app.all(`${ACCOUNT_FILES_BASE_PATH}/*`, handler);
}

/**
 * Returns the FileFn response with the isolation headers and, for file bytes,
 * `Content-Disposition: attachment` (keeping any filename parameter).
 */
export function isolateFileResponse(
  request: Request,
  response: Response
): Response {
  const isolated = new Response(response.body, response);
  for (const [name, value] of Object.entries(FILE_RESPONSE_ISOLATION_HEADERS)) {
    isolated.headers.set(name, value);
  }
  if (carriesFileBytes(request, isolated)) {
    isolated.headers.set(
      "content-disposition",
      asAttachment(isolated.headers.get("content-disposition"))
    );
  }
  return isolated;
}

const SHARE_LINKS_SEGMENT = "share-links";

/**
 * Returns a `/files` request path that is safe to log: the segment after
 * `share-links`, which is the anonymous share token on the share download and
 * revoke routes, becomes `:token`. Other paths are returned unchanged.
 */
export function redactFileRequestPath(pathname: string): string {
  if (
    pathname !== ACCOUNT_FILES_BASE_PATH &&
    !pathname.startsWith(`${ACCOUNT_FILES_BASE_PATH}/`)
  ) {
    return pathname;
  }
  const segments = pathname.split("/");
  for (let index = 0; index < segments.length - 1; index += 1) {
    if (isShareLinksSegment(segments[index]) && segments[index + 1]) {
      segments[index + 1] = ":token";
    }
  }
  return segments.join("/");
}

function isShareLinksSegment(segment: string): boolean {
  try {
    return decodeURIComponent(segment).toLowerCase() === SHARE_LINKS_SEGMENT;
  } catch {
    return false;
  }
}

function carriesFileBytes(request: Request, response: Response): boolean {
  if (response.status === 204 || response.status === 304) {
    return false;
  }
  if (new URL(request.url).pathname.startsWith(PROXY_PATH_PREFIX)) {
    return true;
  }
  const contentType = response.headers.get("content-type") ?? "";
  return !/^application\/json\b/i.test(contentType.trim());
}

function asAttachment(disposition: string | null): string {
  const parameters = disposition
    ?.split(";")
    .slice(1)
    .map((parameter) => parameter.trim())
    .filter(Boolean);
  return parameters?.length
    ? `attachment; ${parameters.join("; ")}`
    : "attachment";
}

function fileErrorResponse(
  status: number,
  code: string,
  message: string
): Response {
  return Response.json(
    { ok: false, error: { code, message } },
    { status }
  );
}
