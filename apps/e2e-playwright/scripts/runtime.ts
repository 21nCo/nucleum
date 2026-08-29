/** Resolves a repository source path for browser-side Vite imports. */
export function resolveRepoFsImportPath(relativePath: string) {
  const path = require("node:path");
  const repoRoot = path
    .resolve(__dirname, "..", "..", "..")
    .replace(/\\/g, "/");
  return `/@fs${repoRoot}/${relativePath}`;
}

/** Ensures an offline browser session exists before the application loads. */
export function ensureOfflineSessionId() {
  try {
    if (window.localStorage.getItem("offlineSessionId")) return;
    const fallback = () => {
      const bytes = new Uint32Array(4);
      globalThis.crypto?.getRandomValues(bytes);
      return Array.from(bytes, (value) => value.toString(16)).join("-");
    };
    const value = globalThis.crypto?.randomUUID?.() ?? fallback();
    window.localStorage.setItem("offlineSessionId", value);
  } catch {}
}
