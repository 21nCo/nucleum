import { LogType } from "./debug.type";

class Logger {
  level: LogType;
  constructor() {
    const logQueryParam = window.location.search
      .split("?")[1]
      ?.split("&")
      .find((x) => x.startsWith("log="));
    if (logQueryParam) {
      const logLevel = logQueryParam.split("=")[1];
      this.level = +logLevel as LogType;
    } else {
      this.level = LogType.INFO;
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
