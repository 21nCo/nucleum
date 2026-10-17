import { get } from "svelte/store";
import { logger } from "@nucleum/client/runtime/logging/logger";
import { generateMiniRandomId } from "@21n/shared-utils/crypto.utils";
import context from "@nucleum/client/runtime/context.store";
import { getGeoLocation } from "@nucleum/client/runtime/geolocation/position";
import { embedBridge } from "@nucleum/client/runtime/embed/embed.store";
import { EmbedMessage } from "@nucleum/client/runtime/embed/embedMessage.enum";

/** Resolves location according to capture preferences. */
export async function resolveLocation() {
  const ctx = get(context);
  if (ctx.isEmbed) {
    try {
      const locationResult = await embedBridge.fetch(
        generateMiniRandomId(),
        EmbedMessage.LOCATION,
        {}
      );
      if (locationResult && !locationResult.error) {
        return locationResult;
      }
    } catch (e) {
      logger.debug({
        at: "CaptureStore.resolveLocation - embed timeout",
        error: e
      });
      return undefined;
    }
  } else {
    try {
      const geoLocation = await getGeoLocation();
      return {
        latitude: geoLocation?.coords.latitude ?? 0,
        longitude: geoLocation?.coords.longitude ?? 0,
        accuracy: geoLocation?.coords.accuracy ?? 0
      };
    } catch (e) {
      logger.debug({
        at: "CaptureStore.resolveLocation - geolocation error",
        error: e
      });
      return undefined;
    }
  }
}
