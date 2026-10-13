import colorSchemes from "@21n/theme/colorschemes.json";
import type { ColorScheme } from "@21n/theme/appearance.type";
import { writable } from "svelte/store";

export interface ElementPlatform {
  embed: string;
  experiments?: Record<string, unknown>;
  isEmbed: boolean;
  isTouchDevice: boolean;
  os: string;
}

export interface ElementAppearance {
  colorScheme: ColorScheme;
}

export interface ElementLogger {
  debug(message: unknown): void;
  error(message: unknown, error?: unknown): void;
  info(message: unknown): void;
  log(message: unknown): void;
  warn(message: unknown): void;
}

const defaultColorScheme = colorSchemes[0] as ColorScheme;

/** Platform presentation state supplied by the host application. */
export const elementPlatform = writable<ElementPlatform>({
  embed: "NONE",
  isEmbed: false,
  isTouchDevice: false,
  os: "UNDETERMINED"
});

/** Theme presentation state supplied by the host application. */
export const elementAppearance = writable<ElementAppearance>({
  colorScheme: defaultColorScheme
});

/** Development presentation state supplied by the host application. */
export const elementDebugMode = writable(false);

let logger: ElementLogger = {
  debug: () => {},
  error: () => {},
  info: () => {},
  log: () => {},
  warn: () => {}
};
let haptic: () => void = () => {};
let assetPathResolver = (path: string) => path;

/** Logger facade configured by an application host. */
export const elementLogger: ElementLogger = {
  debug: (message) => logger.debug(message),
  error: (message, error) => logger.error(message, error),
  info: (message) => logger.info(message),
  log: (message) => logger.log(message),
  warn: (message) => logger.warn(message)
};

/** Updates the portable platform state without exposing host stores. */
export function syncElementPlatform(value: ElementPlatform) {
  elementPlatform.set(value);
}

/** Updates the portable appearance state without exposing host stores. */
export function syncElementAppearance(value: ElementAppearance) {
  elementAppearance.set(value);
}

/** Updates development-only element presentation. */
export function syncElementDebugMode(value: boolean) {
  elementDebugMode.set(value);
}

/** Installs the host logger used by portable elements. */
export function configureElementLogger(value: ElementLogger) {
  logger = value;
}

/** Installs optional host interaction feedback. */
export function configureElementHaptic(value: () => void) {
  haptic = value;
}

/** Installs portable asset URL resolution supplied by the host application. */
export function configureElementAssetPath(value: (path: string) => string) {
  assetPathResolver = value;
}

/** Resolves an application-hosted asset without coupling UI to product storage. */
export function resolveElementAssetPath(path: string) {
  return assetPathResolver(path);
}

/** Requests interaction feedback when the host supports it. */
export function elementHaptic() {
  haptic();
}
