import { resolveJsonResponse } from "@nucleum/client/runtime/network/json-response";
import { performApiCall } from "@nucleum/client/runtime/network/legacy-api";
import { logger } from "@nucleum/client/runtime/logging/logger";

/** Remote operations for legacyAccountTransport; local persistence is owned separately. */
export const legacyAccountTransport = {
  /** Executes the existing getUserInfo transport operation. */
  getUserInfo: async (token: string) => {
    try {
      const response = resolveJsonResponse(
        await performApiCall("account/n/refresh", "POST", {
          token
        })
      );
      if (!response?.ok) {
        return;
      }
      const data = await response.json();
      if (!data?.userInfo) return;
      return data;
    } catch (err) {
      logger.error({ at: "getUserInfo", error: err });
    }
  },
  /** Executes the existing runAccountAction transport operation. */
  async runAccountAction(action: string, params: any) {
    try {
      const apiBaseUrl =
        import.meta.env?.VITE_API_URL ??
        (typeof process !== "undefined"
          ? process.env?.PLASMO_PUBLIC_API_URL
          : undefined);
      if (!apiBaseUrl) {
        return;
      }
      const response = resolveJsonResponse(
        await performApiCall("account/n/action", "POST", {
          action,
          ...params
        })
      );
      if (!response?.ok) {
        return;
      }
      const data = await response.json();
      return data;
    } catch (err) {
      logger.error({ at: "runAccountAction", error: err });
    }
  }
};
