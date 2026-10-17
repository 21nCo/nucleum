/** Logging operations used by local persistence and migration code. */
export type PersistenceLogger = {
  error(message: unknown, error?: unknown): void;
  info(message: unknown): void;
};

let logger: PersistenceLogger | undefined;

/** Installs the application logger at the composition boundary. */
export function configurePersistenceLogger(value: PersistenceLogger) {
  logger = value;
}

/** Returns the configured logger for persistence diagnostics. */
export function requirePersistenceLogger(): PersistenceLogger {
  if (!logger) throw new Error("Persistence logger has not been configured");
  return logger;
}
