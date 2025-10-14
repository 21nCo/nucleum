import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handle } from "@hono/vercel";
import app from "../src/router";

export const config = {
  runtime: "nodejs18.x"
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  return handle(app)(req, res);
}
