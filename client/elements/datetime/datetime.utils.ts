import { TimeScale } from "$lib/client/types/time.type";
import { resolveUnixTimestamp } from "$lib/shared/utils/time.utils";

export const activeScales = [
  TimeScale.YEARS,
  TimeScale.MONTHS,
  TimeScale.WEEKS,
  TimeScale.DAYS
];

export const scaleThresholds = {
  [TimeScale.YEARS]: 365.25,
  [TimeScale.QUARTERS]: 91.31,
  [TimeScale.MONTHS]: 60,
  [TimeScale.WEEKS]: 14,
  [TimeScale.DAYS]: 0
};

export function getDaysCount(start: Date, end: Date): number {
  if (!start || !end) return 0;
  const diffMs = end.getTime() - start.getTime();
  return diffMs / (1000 * 60 * 60 * 24);
}

/**
 * Calculates the time offset needed to ensure a date maintains the same day
 * when converted to UTC via toISOString().
 *
 * @param date The input date
 * @returns A new Date object with the appropriate offset to maintain the same day in UTC
 */
export function getUtcSafeDay(date: Date): Date {
  if (!date) return date;
  const localDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  const timezoneOffset = localDay.getTimezoneOffset();
  const offsetDate = new Date(localDay);
  if (timezoneOffset < 0) {
    offsetDate.setMinutes(offsetDate.getMinutes() - timezoneOffset);
  } else {
    offsetDate.setMinutes(offsetDate.getMinutes() + timezoneOffset);
  }
  return offsetDate;
}

export function getTimePeriodFilterForDay(day: Date) {
  const localDay = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const end = new Date(localDay.getTime() + 24 * 60 * 60 * 1000);
  return {
    greaterThanOrEqual: resolveUnixTimestamp(localDay),
    lessThanOrEqual: resolveUnixTimestamp(end)
  };
}

export function calculateTimeSpan(
  start: Date,
  end: Date,
  scales: TimeScale[] = Object.values(TimeScale),
  scale?: TimeScale
): { count: number; scale: TimeScale } {
  const diffDays = getDaysCount(start, end);
  if (scale) {
    return {
      count: Math.ceil(
        scale === TimeScale.DAYS
          ? diffDays
          : scale === TimeScale.WEEKS
            ? diffDays / 7
            : scale === TimeScale.MONTHS
              ? diffDays / 30.44
              : scale === TimeScale.QUARTERS
                ? diffDays / 91.31
                : diffDays / 365.25
      ),
      scale
    };
  }
  const defaultScale = resolveDefaultSpanScale(start, end, scales);
  return calculateTimeSpan(start, end, scales, defaultScale);
}

export function resolveDefaultSpanScale(
  start: Date,
  end: Date,
  scales: TimeScale[] = Object.values(TimeScale)
): TimeScale | undefined {
  if (!start || !end) return undefined;
  const diffDays = getDaysCount(start, end);

  const availableThresholds = Object.entries(scaleThresholds)
    .filter(([scale]) => scales.includes(scale as TimeScale))
    .map(([scale, threshold]) => ({ scale: scale as TimeScale, threshold }));

  const selectedScale = availableThresholds.find(
    ({ threshold }) => diffDays >= threshold
  );

  return selectedScale?.scale || scales[scales.length - 1];
}
