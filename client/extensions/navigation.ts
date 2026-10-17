/** Open link. */
export async function openLink(
  url: string
): Promise<chrome.tabs.Tab | undefined> {
  return new Promise((resolve, reject) => {
    chrome.tabs.create({ url: url }, (tab) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(tab);
      }
    });
  });
}

/** Open app path. */
export async function openAppPath(path: string) {
  return openLink(resolveAppPath(path));
}

/** Resolve app path. */
export function resolveAppPath(path: string) {
  const appUrl =
    (typeof process !== "undefined"
      ? process.env?.PLASMO_PUBLIC_APP_URL
      : undefined) ?? "https://web.memotron.app";
  return appUrl + "/" + path;
}
