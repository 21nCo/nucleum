export enum TimeScale {
  DAYS = "DAYS",
  WEEKS = "WEEKS",
  MONTHS = "MONTHS",
  QUARTERS = "QUARTERS",
  YEARS = "YEARS"
}

export enum TimePeriodType {
  /**
   * A relative time period is a time period that is relative to the current time. For example, a relative time period with {@link TimePeriodValue} of -1 would be the time period from now to 1 day ago.
   */
  RELATIVE = "RELATIVE",
  /**
   * A calendar bound time period is a time period that is bound by a specific date or a month or a year. For example, a calendar bound time period with {@link TimePeriodValue} of [2021, 02] would be the time period from 1st February 2021 to 28th February 2021.
   */
  CALENDAR_BOUND = "CALENDAR_BOUND",
  /**
   * An absolute time period is a time period that is bound by two specific dates or months or years according to the scale chosen. For example, an absolute time period with {@link TimePeriodValue} of {start: 1st February 2021, end: 28th February 2021} would be the time period from 1st February 2021 to 28th February 2021.
   */
  ABSOLUTE = "ABSOLUTE"
}

export type TimePeriod = {
  scale: TimeScale;
  value: TimePeriodValue;
};

export type TimePeriodValue =
  | { type: TimePeriodType.RELATIVE; param: number }
  | { type: TimePeriodType.CALENDAR_BOUND; param: number[] }
  | { type: TimePeriodType.ABSOLUTE; param: { start: Date; end: Date } };

export enum TimeFormat {
  VERBOSE = "verbose",
  CLOCK = "clock"
}

export enum TimeUnit {
  SECONDS = "seconds",
  MINUTES = "minutes",
  HOURS = "hours"
}

export type TimeSuggestion = {
  label: string;
  value: number;
  unit: TimeUnit;
};
