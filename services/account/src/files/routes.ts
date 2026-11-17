import type { FileFn } from "@filefn/server";
import type { Hono, MiddlewareHandler } from "hono";
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
 * code and details, as the AuthFn routes answer it. Any other error thrown
 * while loading FileFn or handling the request still goes through the app's
 * error handler and is then answered as an isolated 500 `FILEFN_INTERNAL_ERROR`.
 * FileFn responses carry the isolation headers, and successful file bytes (the
 * proxy download routes and any non-JSON 2xx response) are sent as attachments.
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
  const isolateErrors: MiddlewareHandler = async (c, next) => {
    await next();
    if (c.error) {
      c.res = isolateFileResponse(
        c.req.raw,
        fileErrorResponse(500, "FILEFN_INTERNAL_ERROR", "File service error")
      );
    }
  };
  app.use(ACCOUNT_FILES_BASE_PATH, isolateErrors);
  app.use(`${ACCOUNT_FILES_BASE_PATH}/*`, isolateErrors);
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

const SHARE_LINKS_MARKER = "share-links";
const SHARE_ROUTE_LITERALS = new Set(["download"]);
const ASCII_ESCAPE_HEX = /^[0-7][0-9a-f]$/i;

const UTF8_DECODER = new TextDecoder();

/**
 * Returns a request path that is safe to log. The path is normalized by
 * decoding every ASCII `%XX` escape to a fixed point, so no encoding depth,
 * invalid byte beside a separator or mount prefix hides the `share-links`
 * marker. A segment matches when its ASCII-lowercased form contains the
 * marker or, to also catch lookalikes such as the Kelvin sign or a marker
 * with combining marks, when it does after decoding UTF-8 escapes, NFKD
 * normalization, dropping combining marks and lowercasing. From the first segment that contains the marker, the rest of that
 * segment and every later non-empty segment except the literal `download` are
 * replaced by `:token`; a marker segment that only folds to the marker is kept
 * and any other folded match is redacted whole, so the anonymous share token
 * never reaches a log whether FileFn serves the path or not. Paths without
 * the marker are returned unchanged.
 */
export function redactFileRequestPath(pathname: string): string {
  const segments = decodeAsciiEscapes(pathname).split("/");
  const markerIndex = segments.findIndex(
    (segment) =>
      asciiLowerCase(segment).includes(SHARE_LINKS_MARKER) ||
      foldForMatch(segment).includes(SHARE_LINKS_MARKER)
  );
  if (markerIndex < 0) {
    return pathname;
  }
  return segments
    .map((segment, index) => {
      if (index < markerIndex) {
        return segment;
      }
      if (index === markerIndex) {
        return redactMarkerSegment(segment);
      }
      return segment && !SHARE_ROUTE_LITERALS.has(foldForMatch(segment))
        ? ":token"
        : segment;
    })
    .join("/");
}

function redactMarkerSegment(segment: string): string {
  const markerStart = asciiLowerCase(segment).indexOf(SHARE_LINKS_MARKER);
  if (markerStart < 0) {
    return foldForMatch(segment) === SHARE_LINKS_MARKER ? segment : ":token";
  }
  const keep = markerStart + SHARE_LINKS_MARKER.length;
  return keep < segment.length ? `${segment.slice(0, keep)}:token` : segment;
}

function foldForMatch(segment: string): string {
  const decoded = segment.replace(/(?:%[0-9a-f]{2})+/gi, (run) =>
    UTF8_DECODER.decode(
      Uint8Array.from(run.slice(1).split("%"), (hex) => Number.parseInt(hex, 16))
    )
  );
  return stripMarks(stripMarks(decoded).toLowerCase());
}

function stripMarks(value: string): string {
  return value.normalize("NFKD").replace(/\p{M}/gu, "");
}

/**
 * Decodes ASCII `%XX` escapes to a fixed point in one left-to-right pass: after
 * each character is appended, an escape ending at it is decoded in place and
 * the check repeats, so nested `%25` layers resolve without rescanning the
 * whole string and the work stays linear in the path length.
 */
function decodeAsciiEscapes(value: string): string {
  const output: string[] = [];
  for (const char of value) {
    output.push(char);
    let escape = trailingAsciiEscape(output);
    while (escape !== null) {
      output.length -= 3;
      output.push(String.fromCodePoint(Number.parseInt(escape, 16)));
      escape = trailingAsciiEscape(output);
    }
  }
  return output.join("");
}

function trailingAsciiEscape(output: string[]): string | null {
  const length = output.length;
  if (length < 3 || output[length - 3] !== "%") {
    return null;
  }
  const hex = `${output[length - 2]}${output[length - 1]}`;
  return ASCII_ESCAPE_HEX.test(hex) ? hex : null;
}

function asciiLowerCase(value: string): string {
  return value.replace(/[A-Z]/g, (char) => char.toLowerCase());
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
