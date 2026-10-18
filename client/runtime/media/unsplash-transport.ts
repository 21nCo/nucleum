import { resolveJsonResponse } from "@nucleum/client/runtime/network/json-response";
import { performApiCall } from "@nucleum/client/runtime/network/legacy-api";

/** Remote operations for unsplashTransport; local persistence is owned separately. */
export const unsplashTransport = {
  /** Executes the existing browseUnsplash transport operation. */
  async browseUnsplash(params?: {
    query?: string;
    page?: number;
    perPage?: number;
  }) {
    const response = resolveJsonResponse(
      await performApiCall("utils/n/run", "POST", {
        action: "unsplash-browse",
        ...params
      })
    );

    if (!response?.ok) return;
    const data = await response.json();
    return data;
  },
  /** Executes the existing triggerUnsplashDownload transport operation. */
  async triggerUnsplashDownload(params?: { url: string }) {
    const response = resolveJsonResponse(
      await performApiCall("utils/n/run", "POST", {
        action: "unsplash-download",
        ...params
      })
    );

    if (!response?.ok) return;
    const data = await response.json();
    return data;
  }
};
