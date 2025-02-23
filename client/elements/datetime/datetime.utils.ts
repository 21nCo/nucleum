import { TimeScale } from "$lib/client/types/time.type";

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
