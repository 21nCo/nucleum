import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AppBindings, AuthContext } from "../types";
import { validateToken } from "../../../server/common/auth/auth.utils";

export async function requireAuth(c: Context<AppBindings>, next: Next) {
  const authHeader = c.req.header("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    throw new HTTPException(401, { message: "Missing authorization header" });
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    throw new HTTPException(401, { message: "Missing bearer token" });
  }

  const payload = await validateToken({
    token,
    host: c.req.header("x-forwarded-host") ?? c.req.header("host") ?? undefined
  });

  if (!payload) {
    throw new HTTPException(401, { message: "Invalid or expired token" });
  }

  const authContext: AuthContext = {
    token,
    payload
  };
  c.set("auth", authContext);
  await next();
}
