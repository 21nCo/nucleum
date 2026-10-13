import type { UserDate } from "@21n/shared-utils/datetime/user-date.type";

/** Pad to two. */
export function padToTwo(x: number) {
  return x.toString().padStart(2, "0");
}

/**
 * Converts Date String from YYYY-MM-DD format to [DD,Month,YYYY] array
 * @param dateString
 * @returns
 */
export function convertDateStringToArray(dateString: string) {
  const [year, month, day] = dateString.split("-");
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];
  const monthName = monthNames[parseInt(month, 10) - 1];
  return [parseInt(day, 10), monthName, parseInt(year, 10)];
}

/** Get user date. */
export function getUserDate(timestamp: number, dayStart: string = "00:00") {
  let dayStartTimeParts = dayStart.split(":");
  let startHours = +dayStartTimeParts[0];
  let startMinutes = +dayStartTimeParts[1];
  let date = new Date(timestamp);
  let hours = date.getHours();
  let minutes = date.getMinutes();
  let isSameDay =
    hours > startHours
      ? true
      : hours === startHours
        ? minutes >= startMinutes
        : false;
  let userDate = {
    day: date.getDate(),
    month: date.getMonth(),
    year: date.getFullYear()
  };
  userDate = isSameDay ? userDate : getOneDayEarlier(userDate);
  return userDate;
}

/** Compare user day. */
export function compareUserDay(x: UserDate, y: UserDate) {
  if (x.day === y.day && x.year === y.year && x.month === y.month) {
    return 0;
  } else if (
    x.year < y.year ||
    (x.year === y.year && x.month < y.month) ||
    (x.year === y.year && x.month === y.month && x.day < y.day)
  ) {
    return -1;
  } else {
    return 1;
  }
}

/** Check is today. */
export function checkIsToday(x: UserDate, dayStart: string = "00:00") {
  let y = getCurrentUserDate(dayStart);
  return compareUserDay(x, y) === 0;
}

/** Check is today using timestamp. */
export function checkIsTodayUsingTimestamp(
  x: number,
  dayStart: string = "00:00"
) {
  let y = getCurrentUserDate(dayStart);
  return checkDay(y, x);
}

/** Check day. */
export function checkDay(
  day: UserDate,
  sessionStartTime: number,
  dayStartSetting: string = "00:00"
) {
  let calculatedDate = getUserDate(sessionStartTime, dayStartSetting);
  return (
    day.year === calculatedDate.year &&
    day.month === calculatedDate.month &&
    day.day === calculatedDate.day
  );
}

/** Get day start time. */
export function getDayStartTime(date: UserDate, dayStart: string = "00:00") {
  const [hours, minutes] = dayStart.split(":").map(Number);
  const day = new Date(date.year, date.month, date.day);
  day.setHours(hours, minutes, 0, 0);
  return day.getTime();
}

/** Get one day later. */
export function getOneDayLater(date: UserDate) {
  let currentDate = new Date(date.year, date.month, date.day);
  const oneDayLater = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
  return {
    day: oneDayLater.getDate(),
    month: oneDayLater.getMonth(),
    year: oneDayLater.getFullYear()
  };
}

/** Get one day earlier. */
export function getOneDayEarlier(date: UserDate) {
  let currentDate = new Date(date.year, date.month, date.day);
  const oneDayEarlier = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
  return {
    day: oneDayEarlier.getDate(),
    month: oneDayEarlier.getMonth(),
    year: oneDayEarlier.getFullYear()
  };
}

/** Get date difference from today. */
export function getDateDifferenceFromToday(date: UserDate) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const inputDate = new Date(date.year, date.month, date.day);
  return Math.round((+inputDate - +today) / (1000 * 60 * 60 * 24));
}

/** Get current user date. */
export function getCurrentUserDate(dayStart: string = "00:00") {
  const now = new Date().getTime();
  return getUserDate(now, dayStart);
}

/** Get just date. */
export function getJustDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * @deprecated - use generateResourceId instead
 * @param timestamp
 * @returns
 */
export function generateSessionId(timestamp: number) {
  return String(Math.floor(timestamp));
}
