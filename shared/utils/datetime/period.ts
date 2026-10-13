import {
  TimePeriodType,
  type TimePeriod,
  TimeScale
} from "@21n/shared-utils/datetime/period.type";
import { months } from "@21n/shared-utils/datetime/date-formatting";

/** Time period label. */
export function timePeriodLabel(period: TimePeriod) {
  const { scale, value } = period;
  if (
    value.type === TimePeriodType.RELATIVE ||
    value.type === TimePeriodType.UPPER_RELATIVE
  ) {
    if (typeof value.param != "number") return;
    if (value.param === 0) {
      if (scale === TimeScale.DAYS && value.type === TimePeriodType.RELATIVE)
        return "Today";
      else if (value.type === TimePeriodType.UPPER_RELATIVE) {
        if (scale === TimeScale.DAYS) return "This Month";
        else if (scale === TimeScale.MONTHS) return "This Year";
      } else return `This ${scale.slice(0, scale.length - 1).toLowerCase()}`;
    } else if (value.param === 1) {
      if (scale === TimeScale.DAYS && value.type === TimePeriodType.RELATIVE)
        return "Tomorrow";
      else return `Next ${scale.toLowerCase()}`;
    } else if (value.param === -1) {
      if (scale === TimeScale.DAYS && value.type === TimePeriodType.RELATIVE)
        return "Yesterday";
      else if (value.type === TimePeriodType.UPPER_RELATIVE) {
        if (scale === TimeScale.DAYS) return "Last Month";
        else if (scale === TimeScale.MONTHS) return "Last Year";
      } else return `Last ${scale.toLowerCase().slice(0, scale.length - 1)}`;
    } else if (value.param < 0) {
      return `Last ${Math.abs(value.param)} ${scale.toLowerCase()}`;
    } else if (value.param > 0) {
      return `Next ${value.param} ${scale.toLowerCase()}`;
    }
  } else if (value.type === TimePeriodType.ABSOLUTE) {
    let start = value.param.start.toString();
    let end = value.param.end.toString();
    if (/[a-zA-Z]/.test(start)) {
      start = new Date(value.param.start).toISOString().split("T")[0];
      end = new Date(value.param.end).toISOString().split("T")[0];
    }
    if (start === end) return start;
    return `${start} to ${end}`;
  }
}

/** Resolve upper relative time period title. */
export function resolveUpperRelativeTimePeriodTitle(
  scale: TimeScale,
  value: number
) {
  if (scale === TimeScale.DAYS && value === 0)
    return `${new Date().toLocaleDateString("default", {
      month: "long",
      year: "numeric"
    })}`;
  else if (scale === TimeScale.DAYS && value === -1) {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    return `${lastMonth.toLocaleDateString("default", {
      month: "long",
      year: "numeric"
    })}`;
  } else if (scale === TimeScale.MONTHS)
    return `${new Date().toLocaleDateString("default", {
      year: "numeric"
    })}`;
}

/** Determine previous time period. */
export function determinePreviousTimePeriod(period: TimePeriod) {
  const val = determineTimePeriodv2(period);
  let previous = val.begin;
  switch (period.scale) {
    case TimeScale.DAYS:
      const numberOfDays = Math.floor(
        (val.end.getTime() - val.begin.getTime()) / (1000 * 60 * 60 * 24)
      );
      previous.setDate(val.begin.getDate() - numberOfDays);
      break;
    case TimeScale.MONTHS:
      const numberOfMonths = Math.floor(
        (val.end.getTime() - val.begin.getTime()) / (1000 * 60 * 60 * 24) / 30
      );
      previous.setMonth(val.begin.getMonth() - numberOfMonths);
      break;
    case TimeScale.YEARS:
      const numberOfYears = Math.floor(
        (val.end.getTime() - val.begin.getTime()) / (1000 * 60 * 60 * 24) / 365
      );
      previous.setFullYear(val.begin.getFullYear() - numberOfYears);
      break;
  }
  return previous;
}

/**
 * @deprecated - Use {@link determineTimePeriodv2} instead
 * @param period
 * @returns
 */
export function determineTimePeriod(period: TimePeriod) {
  let begin = new Date();
  let end = new Date();
  let title;
  if (
    period.value.type === TimePeriodType.ABSOLUTE &&
    period.value instanceof Object &&
    "start" in period.value &&
    "end" in period.value
  ) {
    begin = period.value.param.start;
    end = period.value.param.end;
    return { begin, end, title: "" };
  }
  if (period.scale === TimeScale.DAYS) {
    if (
      period.value.type === TimePeriodType.RELATIVE &&
      typeof period.value.param === "number"
    ) {
      begin.setDate(begin.getDate() + period.value.param);
      title = timePeriodLabel(period);
      if (period.value.param === -1) {
        end.setDate(end.getDate() - 1);
      }
    } else if (
      period.value.type === TimePeriodType.CALENDAR_BOUND &&
      period.value instanceof Array
    ) {
      const year = period.value[0];
      const month = period.value[1];
      begin.setFullYear(year);
      begin.setMonth(month);
      begin.setDate(1);
      end.setFullYear(year);
      end.setMonth(month);
      end.setDate(31);
      title = `Days of ${months[month]} ${year}`;
    }
  } else if (period.scale === TimeScale.MONTHS) {
    if (
      period.value.type === TimePeriodType.RELATIVE &&
      typeof period.value.param === "number"
    ) {
      begin.setMonth(begin.getMonth() + period.value.param);
      title = timePeriodLabel(period);
      if (period.value.param === -1) {
        end.setMonth(end.getMonth() - 1);
      }
      begin.setDate(1);
      end.setDate(31);
    } else if (
      period.value.type === TimePeriodType.CALENDAR_BOUND &&
      period.value instanceof Array
    ) {
      const year = period.value[0];
      begin.setFullYear(year);
      begin.setMonth(0);
      begin.setDate(1);
      end.setFullYear(year);
      end.setMonth(11);
      end.setDate(31);
      title = `Months of ${year}`;
    }
  } else if (period.scale === TimeScale.YEARS) {
    if (
      period.value.type === TimePeriodType.RELATIVE &&
      typeof period.value.param === "number"
    ) {
      begin.setFullYear(begin.getFullYear() + period.value.param);
      title = timePeriodLabel(period);
      if (period.value.param === -1) {
        end.setFullYear(end.getFullYear() - 1);
      }
      begin.setDate(1);
      end.setDate(31);
      begin.setMonth(0);
      end.setMonth(11);
    } else if (
      period.value.type === TimePeriodType.CALENDAR_BOUND &&
      period.value instanceof Array
    ) {
      const year = period.value[0];
      begin.setFullYear(year);
      begin.setMonth(0);
      begin.setDate(1);
      end.setFullYear(year);
      end.setMonth(11);
      end.setDate(31);
      title = `Year ${year}`;
    }
  }
  begin.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { begin, end, title };
}

/** Determine time periodv2. */
export function determineTimePeriodv2(period: TimePeriod): {
  begin: Date;
  end: Date;
  title: string;
} {
  let begin = new Date();
  let end = new Date();
  let title = timePeriodLabel(period) ?? "";
  if (
    period.value.type === TimePeriodType.ABSOLUTE &&
    period.value instanceof Object &&
    "start" in period.value.param &&
    "end" in period.value.param
  ) {
    begin = period.value.param.start;
    end = period.value.param.end;
    begin = new Date(period.value.param.start);
    end = new Date(period.value.param.end);
    if (period.scale === TimeScale.YEARS) {
      end.setMonth(11);
    }
    if (period.scale === TimeScale.MONTHS || period.scale === TimeScale.YEARS) {
      const month = (end.getMonth() + 1) % 12;
      const year = month == 0 ? end.getFullYear() + 1 : end.getFullYear();
      const endDate = new Date(Date.UTC(year, month, 0)).getDate();
      end.setDate(endDate);
    }
    return { begin, end, title: "" };
  }
  if (
    period.scale === TimeScale.DAYS &&
    period.value.type === TimePeriodType.RELATIVE &&
    typeof period.value.param === "number"
  ) {
    begin.setDate(begin.getDate() + period.value.param);
    if (period.value.param === -1) {
      end.setDate(end.getDate() - 1);
    }
  } else if (
    ((period.scale === TimeScale.MONTHS &&
      period.value.type === TimePeriodType.RELATIVE) ||
      (period.scale === TimeScale.DAYS &&
        period.value.type === TimePeriodType.UPPER_RELATIVE)) &&
    typeof period.value.param === "number"
  ) {
    begin.setMonth(begin.getMonth() + period.value.param);
    if (period.value.param === -1) {
      end.setMonth(end.getMonth() - 1);
    }
    begin.setDate(1);
    end.setDate(31);
  } else if (
    ((period.scale === TimeScale.YEARS &&
      period.value.type === TimePeriodType.RELATIVE) ||
      (period.scale === TimeScale.MONTHS &&
        period.value.type === TimePeriodType.UPPER_RELATIVE)) &&
    typeof period.value.param === "number"
  ) {
    begin.setFullYear(begin.getFullYear() + period.value.param);
    if (period.value.param === -1) {
      end.setFullYear(end.getFullYear() - 1);
    }
    begin.setDate(1);
    end.setDate(31);
    begin.setMonth(0);
    end.setMonth(11);
  }
  begin.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { begin, end, title };
}

/** Get correspoing horizon frequency label. */
export function getCorrespoingHorizonFrequencyLabel(scale: TimeScale) {
  switch (scale) {
    case TimeScale.DAYS:
      return "Daily";
    case TimeScale.WEEKS:
      return "Weekly";
    case TimeScale.MONTHS:
      return "Monthly";
    case TimeScale.QUARTERS:
      return "Quarterly";
    case TimeScale.YEARS:
      return "Yearly";
  }
}
