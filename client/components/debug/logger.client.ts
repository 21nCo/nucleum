import { LogType } from "@21n/components/debug/debug.type";

const LOG_METHODS: Record<LogType, "debug" | "error" | "info" | "warn"> = {
  [LogType.ERROR]: "error",
  [LogType.WARN]: "warn",
  [LogType.INFO]: "info",
  [LogType.TRACE]: "debug",
  [LogType.DEBUG]: "debug"
};

class Logger {
  level: LogType = LogType.ERROR;
  constructor() {
    this.setDefaultLevel();
  }

  setDefaultLevel() {
    try {
      if (
        typeof window !== "undefined" &&
        window?.location?.search?.includes("log=")
      ) {
        const logQueryParam = window?.location?.search
          .split("?")[1]
          ?.split("&")
          .find((x) => x.startsWith("log="));
        const logLevel = logQueryParam?.split("=")[1];
        this.level = +(logLevel ?? "0") as LogType;
      } else {
        const defaultLevel =
          import.meta.env?.VITE_LOG_LEVEL ??
          (typeof process !== "undefined" ? process.env?.PLASMO_PUBLIC_LOG_LEVEL : undefined) ??
          LogType.INFO;
        this.level = Number(defaultLevel) as LogType;
      }
    } catch (e) {
      console.error("Error setting log level", e);
      this.level = LogType.ERROR;
    }
  }

  private _console(message: unknown, type: LogType) {
    const payload =
      typeof message === "object" && message !== null
        ? { ...(message as Record<string, unknown>), t: new Date().toISOString() }
        : { message, t: new Date().toISOString() };
    console[LOG_METHODS[type]](payload);
  }
  private _log(message: unknown, type: LogType) {
    if (type <= this.level) {
      this._console(message, type);
    }
  }
  log(
    message: unknown,
    type: LogType.INFO | LogType.TRACE | LogType.DEBUG = LogType.TRACE
  ) {
    this._log(message, type);
  }
  info(message: unknown) {
    this._log(message, LogType.INFO);
  }
  error(message: unknown, error?: unknown) {
    this._log({ message, error }, LogType.ERROR);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("errorLog", {
          detail: {
            error,
            message
          }
        })
      );
    }
  }
  warn(message: unknown) {
    this._log(message, LogType.WARN);
  }
  debug(message: unknown) {
    this._console(message, LogType.DEBUG);
  }

  setLevel(level: LogType) {
    this.level = level;
  }
}

export const logger = new Logger();
