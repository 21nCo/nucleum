export type NavigationLinkTarget =
  | { kind: "internal"; url: string }
  | { kind: "external"; url: string }
  | { kind: "system"; url: string };

/** Resolves app paths, web links, and supported system link handlers. */
export function resolveNavigationLinkTarget(
  input: string,
  origin: string
): NavigationLinkTarget | undefined {
  input = input.trim();
  if (!input) return;
  const isRelative =
    !input.startsWith("//") && !/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(input);
  try {
    const base = new URL(
      /^https?:\/\//i.test(origin) ? origin : "https://navigation.invalid/"
    );
    const parsed = new URL(input, base);
    if (parsed.protocol === "mailto:" || parsed.protocol === "tel:") {
      return { kind: "system", url: parsed.href };
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return;
    if (isRelative && parsed.origin === base.origin)
      return { kind: "internal", url: input };
    return { kind: "external", url: parsed.href };
  } catch {
    return;
  }
}

/** URL schemes the native Nucleum, Memotron and Pointron apps register for sign-in returns. */
const NATIVE_SIGN_IN_SCHEMES = new Set(["nucleum:", "memotron:", "pointron:"]);

/**
 * Checks whether a navigation target may be assigned to `window.location`:
 * http(s), mailto and tel URLs, and the native apps' `<app>://oauthsignin`
 * sign-in links. Script schemes such as `javascript:` are refused.
 */
export function isAllowedLocationTarget(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value.trim());
    if (["http:", "https:", "mailto:", "tel:"].includes(url.protocol))
      return true;
    return (
      NATIVE_SIGN_IN_SCHEMES.has(url.protocol) && url.hostname === "oauthsignin"
    );
  } catch {
    return false;
  }
}

/**
 * Resolves a navigation path against the current page URL and returns it only
 * when it may be assigned to `window.location`: the app's own scheme and host
 * (including the bundled `tauri://localhost` app), web, mail and native sign-in
 * targets; never script URLs.
 */
export function resolveLocationTarget(
  path: string,
  currentHref: string
): string | undefined {
  try {
    const current = new URL(currentHref);
    const target = new URL(path, current);
    const isSamePage =
      target.protocol === current.protocol && target.host === current.host;
    return isSamePage || isAllowedLocationTarget(target.href)
      ? target.href
      : undefined;
  } catch {
    return undefined;
  }
}
