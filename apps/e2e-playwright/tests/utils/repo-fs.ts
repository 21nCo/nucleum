import path from "node:path";

/**
 * Build a Vite `/@fs/...` import path for repo modules used inside page.evaluate.
 */
export function resolveRepoFsImportPath(relativePath: string) {
  const repoRoot = path
    .resolve(__dirname, "..", "..", "..", "..")
    .replace(/\\/g, "/");
  return `/@fs${repoRoot}/${relativePath}`;
}

/**
 * Browser init script: ensure offlineSessionId exists in localStorage.
 */
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
