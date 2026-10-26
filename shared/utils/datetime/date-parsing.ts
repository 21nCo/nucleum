/** Parse relative time to iso. */
export function parseRelativeTimeToISO(label: string, now: Date = new Date()) {
  if (!label) return undefined;
  const match = label
    .trim()
    .toLowerCase()
    .match(/(\d+)\s*(s|m|h|d|w|mo|y)\b/);
  if (!match) return undefined;
  const amount = parseInt(match[1], 10);
  const unit = match[2];
  const date = new Date(now);
  if (unit === "s") date.setSeconds(date.getSeconds() - amount);
  else if (unit === "m") date.setMinutes(date.getMinutes() - amount);
  else if (unit === "h") date.setHours(date.getHours() - amount);
  else if (unit === "d") date.setDate(date.getDate() - amount);
  else if (unit === "w") date.setDate(date.getDate() - amount * 7);
  else if (unit === "mo") {
    const currentMonth = date.getMonth();
    const currentYear = date.getFullYear();
    let newMonth = currentMonth - amount;
    let newYear = currentYear;
    while (newMonth < 0) {
      newMonth += 12;
      newYear -= 1;
    }
    date.setFullYear(newYear);
    date.setMonth(newMonth);
  } else if (unit === "y") date.setFullYear(date.getFullYear() - amount);
  return date.toISOString();
}

/** Parse full date time string. */
export function parseFullDateTimeString(
  dateTimeString: string
): Date | undefined {
  if (!dateTimeString) return undefined;

  const match = dateTimeString.match(
    /^(\w+)\s+(\d+),\s+(\d+)\s+at\s+(\d+):(\d+)\s+(AM|PM)$/i
  );
  if (!match) return undefined;

  const [, monthName, day, year, hour, minute, period] = match;

  const monthMap: { [key: string]: number } = {
    january: 0,
    february: 1,
    march: 2,
    april: 3,
    may: 4,
    june: 5,
    july: 6,
    august: 7,
    september: 8,
    october: 9,
    november: 10,
    december: 11
  };

  const month = monthMap[monthName.toLowerCase()];
  if (month === undefined) return undefined;

  let hour24 = parseInt(hour, 10);
  if (period.toUpperCase() === "PM" && hour24 !== 12) hour24 += 12;
  if (period.toUpperCase() === "AM" && hour24 === 12) hour24 = 0;

  return new Date(
    parseInt(year, 10),
    month,
    parseInt(day, 10),
    hour24,
    parseInt(minute, 10)
  );
}
