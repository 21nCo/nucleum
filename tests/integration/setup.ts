import { beforeAll } from "vitest";

beforeAll(() => {
  process.env.APP_BASE_URL = process.env.APP_BASE_URL ?? "http://127.0.0.1:4173";
});
