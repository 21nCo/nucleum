import { LogType } from "./debug.type";

class Logger {
  level: LogType;
  constructor() {
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
        this.level =
          import.meta.env?.VITE_LOG_LEVEL ??
          process.env.PLASMO_PUBLIC_LOG_LEVEL ??
          LogType.INFO;
      }
    } catch (e) {
      console.error("Error setting log level", e);
      this.level = LogType.ERROR;
    }
  }

  private _console(message: any, type: LogType) {
    if (type === LogType.TRACE) type = LogType.DEBUG;
    // if (type === LogType.DEBUG) type = LogType.TRACE;
    const logTypeName = LogType[type].toLowerCase();
    console[logTypeName]({ ...message, t: new Date().toISOString() });
  }
  private _log(message: any, type: LogType) {
    if (type <= this.level) {
      this._console(message, type);
    }
  }
  log(
    message: any,
    type: LogType.INFO | LogType.TRACE | LogType.DEBUG = LogType.TRACE
  ) {
    // console.log({ ...message, type: LogType[type] });
    this._log(message, type);
  }
  info(message: any) {
    this._log(message, LogType.INFO);
  }
  error(message: any) {
    this._log(message, LogType.ERROR);
    throw new Error("Error in logger" + JSON.stringify(message), {
      cause: message
    });
  }
  debug(message: any) {
    this._console(message, LogType.DEBUG);
  }
}

export const logger = new Logger();
