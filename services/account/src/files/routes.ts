import type { FileFn } from "@filefn/server";
import type { Hono } from "hono";
import { ACCOUNT_FILES_BASE_PATH } from "./server.js";

export interface RegisterAccountFileRoutesInput {
  app: Hono;
  getFileFn: () => Promise<FileFn | null>;
}

/**
 * Registers FileFn under `/files`. Requests return 503 when the region has no
 * file storage configured and 404 for paths FileFn does not serve.
 */
export function registerAccountFileRoutes(
  input: RegisterAccountFileRoutesInput
): void {
  const { app, getFileFn } = input;
  const handler = async (c: { req: { raw: Request } }) => {
    const fileFn = await getFileFn();
    if (!fileFn) {
      return fileErrorResponse(
        503,
        "FILEFN_UNAVAILABLE",
        "File storage is not configured for this region"
      );
    }
    const response = await fileFn.router.handle(c.req.raw);
    return (
      response ?? fileErrorResponse(404, "FILEFN_ROUTE_NOT_FOUND", "Not found")
    );
  };
  app.all(ACCOUNT_FILES_BASE_PATH, handler);
  app.all(`${ACCOUNT_FILES_BASE_PATH}/*`, handler);
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
