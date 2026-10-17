import moment from "moment-timezone";

/**
 * Returns an array of time zones with offsets.
 * @returns Array of time zones with offsets
 */
export const getTimeZonesWithOffsets = () => {
  const zones = moment.tz.names();
  return zones.map((zone) => {
    const offset = moment.tz(zone).utcOffset();
    const formattedOffset =
      (offset >= 0 ? "+" : "-") +
      String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0") +
      ":" +
      String(Math.abs(offset) % 60).padStart(2, "0");
    return {
      label: zone + " (UTC" + formattedOffset + ")",
      offset,
      zone
    };
  });
};

/**
 * Detects the time zone of the user.
 * @returns The time zone of the user.
 */
export function detectTimeZone() {
  const timeZones = getTimeZonesWithOffsets();
  try {
    const detectedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timeZone = timeZones.find((x: any) => x.zone === detectedTimeZone);
    return timeZone;
  } catch (error) {
    console.error("Could not detect time zone:", error);
  }
}

/**
 * Date().getTimezoneOffset() returns the offset in minutes and calculates offfset by measuring current user's timezone as 0 and relative measure of UTC from that.
 *
 * Ex: If user is in UTC+5:30, getTimezoneOffset() will return -330 which is UTC is -330 minutes away from current user's timezone.
 *
 * On the database, the offset is stored as an offset of user's zone from UTC, so the offset is stored as +330 for UTC+5:30
 *
 */
export function detectTimeZoneFallback() {
  const offset = -new Date().getTimezoneOffset() * 60;
  const label = detectTimeZone()?.label ?? "UTC";
  return { offset, label };
}
