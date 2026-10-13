/** Resolves the browser or packaged application host. */
export function resolveLaunchHost() {
  if (isHttpBrowserLocation()) {
    return window.location.host;
  }
  return (
    import.meta.env?.VITE_HOST ??
    (typeof process !== "undefined"
      ? process.env?.PLASMO_PUBLIC_APP_URL
      : undefined) ??
    window.location.host
  );
}

function isHttpBrowserLocation() {
  return (
    typeof window !== "undefined" &&
    (window.location.protocol === "http:" ||
      window.location.protocol === "https:")
  );
}

/** Normalizes equivalent local environment labels before session checks. */
export function normalizeEnvForComparison(env: string | null | undefined) {
  if (isLocalDevelopmentHost() && (env === "landing" || env === "local")) {
    return "local";
  }
  return env;
}

function isLocalDevelopmentHost() {
  const host = window.location.hostname;
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".localhost") ||
    host.startsWith("local.")
  );
}
