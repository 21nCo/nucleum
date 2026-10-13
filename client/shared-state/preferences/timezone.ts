import { get } from "svelte/store";

import { userPreferences } from "@nucleum/shared-state/preferences/user-preferences.store";

import { logger } from "@nucleum/client/runtime/logging/logger";

import { detectTimeZone } from "@21n/shared-utils/datetime/timezone";

import { nucleumDatafnStatus } from "@nucleum/datafn/datafn.store";

/** Persists a detected timezone change using the preference store. */
export async function refreshTimeZone() {
  if (get(nucleumDatafnStatus).nucleumMode === null) return;
  const timeZone = detectTimeZone();
  if (!timeZone || !get(userPreferences)) return;
  const offset = timeZone.offset * 60;
  if (
    get(userPreferences).timeZoneOffset === offset &&
    get(userPreferences).timeZone === timeZone.zone
  ) {
    return;
  }
  logger.info({
    at: "refreshTimeZone - timezone change detected",
    timeZone
  });
  await userPreferences.setTimeZone(offset, timeZone.label, timeZone.zone);
}
