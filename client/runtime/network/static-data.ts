import { determineIfOffline } from "@nucleum/client/runtime/connectivity";

/** Fetches versioned static data when the client is online. */
export async function performStaticDataOperation(path: string) {
  const isOffline = await determineIfOffline();
  if (isOffline) return;
  return fetch(
    import.meta.env?.VITE_STATIC_URL + "/" + path + "?v=" + Date.now()
  );
}
