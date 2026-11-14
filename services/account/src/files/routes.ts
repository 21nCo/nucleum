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
 * response carries the isolation headers, and successful file bytes (the proxy
 * download routes and any non-JSON 2xx response) are sent as attachments.
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
 * Returns the FileFn response with the isolation headers and, for successful
 * file bytes, `Content-Disposition: attachment` with the original parameters
 * kept verbatim.
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
const SHARE_ROUTE_LITERALS = new Set(["download"]);
const MAX_DECODE_PASSES = 4;

/**
 * Returns a request path that is safe to log. A path that names a
 * `share-links` segment once percent-decoded (any casing, any mount prefix or
 * encoding, empty segments allowed) is logged decoded, with every non-empty
 * segment after it except the literal `download` replaced by `:token`, so the
 * anonymous share token never reaches a log whether FileFn serves the path or
 * not. Other paths are returned unchanged.
 */
export function redactFileRequestPath(pathname: string): string {
  const segments = decodeForLog(pathname).split("/");
  const shareIndex = segments.findIndex(
    (segment) => segment.toLowerCase() === SHARE_LINKS_SEGMENT
  );
  if (shareIndex < 0) {
    return pathname;
  }
  return segments
    .map((segment, index) =>
      index > shareIndex &&
      segment &&
      !SHARE_ROUTE_LITERALS.has(segment.toLowerCase())
        ? ":token"
        : segment
    )
    .join("/");
}

function decodeForLog(value: string): string {
  let current = value;
  for (let pass = 0; pass < MAX_DECODE_PASSES; pass += 1) {
    const decoded = decodeEscapes(current);
    if (decoded === current) {
      break;
    }
    current = decoded;
  }
  return current;
}

function decodeEscapes(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value.replace(/(?:%[0-9a-f]{2})+/gi, (escapes) => {
      try {
        return decodeURIComponent(escapes);
      } catch {
        return escapes;
      }
    });
  }
}

function carriesFileBytes(request: Request, response: Response): boolean {
  if (response.status < 200 || response.status >= 300 || response.status === 204) {
    return false;
  }
  if (new URL(request.url).pathname.startsWith(PROXY_PATH_PREFIX)) {
    return true;
  }
  const contentType = response.headers.get("content-type") ?? "";
  return !/^application\/json\b/i.test(contentType.trim());
}

function asAttachment(disposition: string | null): string {
  const separator = disposition?.indexOf(";") ?? -1;
  const parameters =
    disposition && separator >= 0 ? disposition.slice(separator + 1).trim() : "";
  return parameters ? `attachment; ${parameters}` : "attachment";
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
