import { resolveJsonResponse } from "@nucleum/client/runtime/network/json-response";
import { performApiCall } from "@nucleum/client/runtime/network/legacy-api";
import { logger } from "@nucleum/client/runtime/logging/logger";

/** Remote operations for addressTransport; local persistence is owned separately. */
export const addressTransport = {
  /** Executes the existing runGeoAction transport operation. */
  async runGeoAction(method: string, params: any) {
    try {
      const response = resolveJsonResponse(
        await performApiCall("utils/n/geo", "POST", {
          method,
          ...params
        })
      );
      if (!response?.ok) {
        return;
      }
      const data = await response.json();
      return data;
    } catch (err) {
      logger.error({ at: "runGeoAction", error: err });
    }
  }
};
