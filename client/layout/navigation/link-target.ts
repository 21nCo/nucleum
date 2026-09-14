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
