import {
  createDatafnPublicLinkAuthPlugin,
  type DatafnHttpTransportOptions
} from "@datafn/client";
import { createNucleumAuthFnTransportAuth } from "@nucleum/client/runtime/account/auth";
import { logger } from "@nucleum/client/runtime/logging/logger";

/** Builds authenticated DataFn HTTP transport options. */
export async function createNucleumDatafnHttpOptions(
  input: {
    publicLinkToken?: string;
  } = {}
): Promise<DatafnHttpTransportOptions> {
  return {
    auth: await createNucleumAuthFnTransportAuth({
      plugins: input.publicLinkToken
        ? [createDatafnPublicLinkAuthPlugin(input.publicLinkToken)]
        : []
    }),
    onError: ({ endpoint, status, result }) => {
      logger.error({
        at: "datafn.remote.error",
        endpoint,
        status,
        result
      });
    }
  };
}
