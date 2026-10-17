import { TimeScale } from "@21n/shared-utils/datetime/period.type";

/** Pie label formatter. */
export function pieLabelFormatter(d: any) {
  if (d.percentageValue < 5) return "";
  else if (d.percentageValue < 10) return `${d.percentageValue.toFixed(1)}%`;
  else return `${d.value.toFixed(1)} hrs (${d.percentageValue.toFixed(1)}%)`;
}

/** Determine carbon chart time interval. */
export function determineCarbonChartTimeInterval(scale: TimeScale) {
  switch (scale) {
    case TimeScale.DAYS:
      return "daily";
    case TimeScale.WEEKS:
      return "weekly";
    case TimeScale.MONTHS:
      return "monthly";
    case TimeScale.QUARTERS:
      return "quarterly";
    case TimeScale.YEARS:
      return "yearly";
  }
}
