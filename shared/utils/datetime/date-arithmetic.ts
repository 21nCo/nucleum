/** Date inputs accepted by date parsing and presentation helpers. */
export type DateValue = Date | string | number;

/** To date value. */
export function toDateValue(
  value: DateValue | undefined | null
): Date | undefined {
  if (value === undefined || value === null) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** To local isostring. */
export function toLocalISOString(date: Date) {
  const pad = (number: number) => (number < 10 ? "0" + number : number);
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const milliseconds = (date.getMilliseconds() / 1000).toFixed(3).slice(2, 5);
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}Z`;
}

/**
 * Increments a date time by a number of hours
 * @param dateTime - date time to increment
 * @param numberOfHours - number of hours to increment by
 * @param isRoundToNearestHour - round to nearest hour
 * @returns
 */
export function incrementTime(
  dateTime: Date,
  numberOfHours: number,
  isRoundToNearestHour: boolean = false
) {
  if (isRoundToNearestHour) {
    const minutes = dateTime.getMinutes();
    const minutesRounded = Math.round(minutes / 60) * 60;
    dateTime.setMinutes(minutesRounded);
  }
  return new Date(dateTime.getTime() + numberOfHours * 60 * 60 * 1000);
}

/** Is same day. */
export function isSameDay(date1: Date, date2: Date) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/** Is same date time. */
export function isSameDateTime(
  date1: Date,
  date2: Date,
  params?: { isIgnoreSeconds?: boolean }
) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate() &&
    date1.getHours() === date2.getHours() &&
    date1.getMinutes() === date2.getMinutes() &&
    (params?.isIgnoreSeconds || date1.getSeconds() === date2.getSeconds())
  );
}

/** Offset date. */
export function offsetDate(date: Date, offset: number) {
  return new Date(date.getTime() + offset * 24 * 60 * 60 * 1000);
}

/**
 * Attaches time to a date - time is in format HH:MM
 * @param date
 * @param time
 * @returns
 */
export function attachTimeToDate(date: Date, time: string) {
  const [hours, minutes] = time.split(":");
  date.setHours(parseInt(hours));
  date.setMinutes(parseInt(minutes));
  return date;
}

/**
 * Compares two dates - ignores time
 * @param date1
 * @param date2
 * @param operator
 * @returns
 */
export function compareDates(
  date1: Date,
  date2: Date,
  operator: "==" | ">=" | "<=" | ">" | "<"
) {
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());

  if (operator === "==") {
    return d1.getTime() === d2.getTime();
  } else if (operator === ">=") {
    return d1.getTime() >= d2.getTime();
  } else if (operator === "<=") {
    return d1.getTime() <= d2.getTime();
  } else if (operator === ">") {
    return d1.getTime() > d2.getTime();
  } else if (operator === "<") {
    return d1.getTime() < d2.getTime();
  }
  return false;
}

/** Get week number. */
export function getWeekNumber(date: Date): number {
  const year = date.getFullYear();
  const yearStart = new Date(year, 0, 1);
  const daysSinceYearStart = Math.floor(
    (date.getTime() - yearStart.getTime()) / 86400000
  );
  const yearStartDay = yearStart.getDay();
  const adjustedDays = daysSinceYearStart + yearStartDay;
  return Math.ceil((adjustedDays + 1) / 7);
}
