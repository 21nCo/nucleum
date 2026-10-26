import { TimeUnit } from "@21n/shared-utils/datetime/duration.type";

/** Resolve duration in seconds. */
export function resolveDurationInSeconds(duration: {
  value: number;
  unit: TimeUnit;
}) {
  switch (duration.unit) {
    case TimeUnit.SECONDS:
      return duration.value;
    case TimeUnit.MINUTES:
      return duration.value * 60;
    case TimeUnit.HOURS:
      return duration.value * 60 * 60;
    default:
      return duration.value;
  }
}
