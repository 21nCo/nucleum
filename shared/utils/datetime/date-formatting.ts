import type { UserDate } from "@21n/shared-utils/datetime/user-date.type";

import { type DateValue } from "@21n/shared-utils/datetime/date-arithmetic";

import { toDateValue } from "@21n/shared-utils/datetime/date-arithmetic";

import { getWeekNumber } from "@21n/shared-utils/datetime/date-arithmetic";

/** Defines months. */
export const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];

type TimePreferences = {
  timeFormat?: string;
};

const locale =
  typeof window !== "undefined"
    ? navigator.language || navigator.languages[0]
    : undefined;

/** Format time. */
export function formatTime(
  userPreferences: TimePreferences,
  date: DateValue,
  params?: { format?: string; isIncludeSeconds?: boolean }
) {
  const resolvedDate = toDateValue(date);
  if (!resolvedDate) return undefined;
  let userPreferredFormat = userPreferences.timeFormat;
  const format = params?.format ?? userPreferredFormat ?? "meridian";
  if (format === "24") {
    let hours = resolvedDate.getHours().toString().padStart(2, "0");
    let minutes = resolvedDate.getMinutes().toString().padStart(2, "0");
    if (!params?.isIncludeSeconds) return `${hours}:${minutes}`;
    let seconds = resolvedDate.getSeconds().toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  } else if (format === "meridian") {
    let hours = resolvedDate.getHours();
    let minutes = resolvedDate.getMinutes().toString().padStart(2, "0");
    let meridian = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours || 12;
    return `${hours}:${minutes} ${meridian}`;
  }
}

/** Format user date. */
export function formatUserDate(
  date: UserDate,
  format: string = "verbose"
): string {
  const dd = date.day.toString().padStart(2, "0");
  const mm = (date.month + 1).toString().padStart(2, "0");
  const yy = String(date.year); //.slice(-2);
  if (format === "yyyy:mm:dd") {
    return `${yy}-${mm}-${dd}`;
  } else if (format === "verbose") {
    return `${dd} ${months[date.month]} ${yy}`;
  }
  return `${yy}-${mm}-${dd}`;
}

/** Format date relative to today. */
export function formatDateRelativeToToday(date: UserDate | Date | number) {
  let inputDate: Date;
  let today: Date = new Date();
  let isArchiveFormat: boolean = false;
  if (typeof date === "number") {
    inputDate = new Date(date);
  } else if (date instanceof Date) {
    inputDate = date;
  } else {
    isArchiveFormat = true;
    const now = new Date();
    today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    inputDate = new Date(date.year, date.month, date.day);
  }

  const dayDifference = Math.round(
    (+inputDate - +today) / (1000 * 60 * 60 * 24)
  );
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ];

  if (dayDifference === 0) {
    return "Today";
  } else if (dayDifference === -1) {
    return "Yesterday";
  } else if (dayDifference <= -2 && dayDifference >= -6) {
    return `Last ${dayNames[inputDate.getDay()]}`;
  } else {
    if (isArchiveFormat) {
      return formatUserDate(date as UserDate);
    }
    return parseAndFormatDate(inputDate);
  }
}

/** Parse and format date. */
export function parseAndFormatDate(
  date: Date | number | string,
  format:
    | "iso"
    | "iso-short"
    | "verbose"
    | "mm-dd"
    | "mmm-dd"
    | "mmm-yy"
    | "mmm-yyyy"
    | "week-yyyy"
    | "yyyy" = "verbose"
) {
  if (typeof date === "number") date = new Date(date);
  else if (typeof date === "string") date = new Date(date);
  if (date.toString() === "Invalid Date") return "";
  if (format === "iso" || format === "iso-short") {
    let year = date.getFullYear();
    let month = (1 + date.getMonth()).toString().padStart(2, "0");
    let day = date.getDate().toString().padStart(2, "0");
    if (format === "iso") return `${year}-${month}-${day}T00:00:00.000Z`;
    else return `${year}-${month}-${day}`;
  } else if (format === "verbose") {
    return date.toLocaleDateString(locale, {
      month: "short",
      day: "2-digit",
      year: "numeric"
    });
  } else if (format === "mmm-dd") {
    return date.toLocaleDateString(locale, {
      month: "short",
      day: "2-digit"
    });
  } else if (format === "mm-dd") {
    return date.toLocaleDateString(locale, {
      month: "2-digit",
      day: "2-digit"
    });
  } else if (format === "mmm-yy") {
    return date.toLocaleDateString(locale, {
      month: "short",
      year: "2-digit"
    });
  } else if (format === "mmm-yyyy") {
    return date.toLocaleDateString(locale, {
      month: "short",
      year: "numeric"
    });
  } else if (format === "yyyy") {
    return date.toLocaleDateString(locale, {
      year: "numeric"
    });
  } else if (format === "week-yyyy") {
    const weekNumber = getWeekNumber(date);
    const year = date.getFullYear();
    return `${year}: W${weekNumber}`;
  }
  return "";
}

/** Format datetime. */
export function formatDatetime(
  userPreferences: TimePreferences,
  date: DateValue
) {
  const resolvedDate = toDateValue(date);
  if (!resolvedDate) return "";
  const formattedDate = parseAndFormatDate(resolvedDate);
  const formattedTime = formatTime(userPreferences, resolvedDate);
  return `${formattedDate} ${formattedTime}`;
}
