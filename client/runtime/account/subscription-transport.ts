import { resolveJsonResponse } from "@nucleum/client/runtime/network/json-response";
import { performApiCall } from "@nucleum/client/runtime/network/legacy-api";
import { logger } from "@nucleum/client/runtime/logging/logger";

/** Remote operations for subscriptionTransport; local persistence is owned separately. */
export const subscriptionTransport = {
  /** Executes the existing getUserPlan transport operation. */
  getUserPlan: async () => {
    try {
      const response = resolveJsonResponse(
        await performApiCall("v2/plan/get", "POST", {})
      );
      if (!response?.ok) {
        return;
      }
      const data = await response.json();
      return data;
    } catch (err) {
      logger.error({ at: "getUserPlan", error: err });
    }
  },
  /** Executes the existing initiateSubscription transport operation. */
  initiateSubscription: async (params: any) => {
    try {
      const response = resolveJsonResponse(
        await performApiCall("v2/plan/subscribe", "POST", {
          ...params
        })
      );
      if (!response?.ok) {
        return;
      }
      const data = await response.json();
      return data;
    } catch (err) {
      logger.error({ at: "initiateSubscription", error: err });
    }
  },
  /** Executes the existing modifySubscription transport operation. */
  modifySubscription: async (params: any) => {
    try {
      const response = resolveJsonResponse(
        await performApiCall("v2/plan/modify", "POST", {
          ...params
        })
      );
      if (!response?.ok) {
        return;
      }
      const data = await response.json();
      return data;
    } catch (err) {
      logger.error({ at: "modifySubscription", error: err });
    }
  },
  /** Executes the existing restorePurchase transport operation. */
  restorePurchase: async () => {
    try {
      const response = resolveJsonResponse(
        await performApiCall("v2/plan/restore", "POST", {})
      );
      if (!response?.ok) {
        return;
      }
      const data = await response.json();
      return data;
    } catch (err) {
      logger.error({ at: "restorePurchase", error: err });
    }
  },
  /** Executes the existing verifyPayment transport operation. */
  verifyPayment: async (nonce: string, embedTransaction?: any) => {
    try {
      const response = resolveJsonResponse(
        await performApiCall("v2/plan/verify", "POST", {
          nonce,
          embedTransaction
        })
      );
      if (!response?.ok) {
        return;
      }
      const data = await response.json();
      return data;
    } catch (err) {
      logger.error({ at: "verifyPayment", error: err });
    }
  }
};
