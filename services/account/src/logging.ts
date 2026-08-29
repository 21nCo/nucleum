import { serverLogger } from "@logfn/core";

export function createLogger() {
  return serverLogger({
    name: "nucleus-account",
    level: (process.env.LOG_LEVEL as never) ?? "info"
  });
}
