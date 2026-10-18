import { resolveJsonResponse } from "@nucleum/client/runtime/network/json-response";
import { performApiCall } from "@nucleum/client/runtime/network/legacy-api";
import { logger } from "@nucleum/client/runtime/logging/logger";

/** Remote operations for fileTransport; local persistence is owned separately. */
export const fileTransport = {
  /** Executes the existing getSignedUrl transport operation. */
  async getSignedUrl(
    userId: string,
    contentType: string,
    fileName: string,
    isTemp: boolean
  ) {
    try {
      const response = resolveJsonResponse(
        await performApiCall(
          "utils/n/getsignedurl",
          "POST",
          {
            method: "PUT",
            contentType,
            fileName,
            userId,
            isTemp
          },
          { isFileApi: true }
        )
      );
      return await response?.json();
    } catch (e) {
      logger.error({ at: "getSignedUrl", error: e });
    }
  },
  /** Executes the existing fetchSignedUrlForGet transport operation. */
  async fetchSignedUrlForGet(key: string) {
    const response = resolveJsonResponse(
      await performApiCall(
        "utils/n/getsignedurl",
        "POST",
        {
          method: "GET",
          key
        },
        { isFileApi: true }
      )
    );
    return await response?.json();
  },
  /** Executes the existing uploadFile transport operation. */
  async uploadFile(uploadUrl: string, contentType: string, blob: any) {
    const result = await fetch(uploadUrl, {
      method: "PUT",
      body: blob,
      headers: {
        "Content-Type": contentType
      }
    });
    if (result.status === 200) {
      return uploadUrl;
    } else {
      return null;
    }
  }
};
