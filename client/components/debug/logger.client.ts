import { LogType } from "./debug.type";

class Logger {
  level: LogType;
  constructor() {
    try {
      if (window?.location?.search?.includes("log=")) {
        const logQueryParam = window?.location?.search
        .split("?")[1]
        ?.split("&")
        .find((x) => x.startsWith("log="));
        const logLevel = logQueryParam.split("=")[1];
        this.level = +logLevel as LogType;
      } else {
        this.level = import.meta.env?.VITE_LOG_LEVEL ?? process.env.PLASMO_PUBLIC_LOG_LEVEL ?? LogType.INFO;
      }
    } catch(e) {
      console.error("Error setting log level", e);
      this.level = LogType.ERROR;
    }
  }

  private _console(message: any, type: LogType) {
    const logTypeName = LogType[type].toLowerCase();
    console[logTypeName]({ t: new Date().toISOString(), ...message });
  }
  private _log(message: any, type: LogType) {
    if (type <= this.level) {
      this._console(message, type);
    }
  }
  log(message: any, type: LogType.INFO | LogType.TRACE = LogType.TRACE) {
    this._log(message, type);
  }
  error(message: any) {
    this._log(message, LogType.ERROR);
  }
  debug(message: any) {
    this._console(message, LogType.DEBUG);
  }
}

export const logger = new Logger();
