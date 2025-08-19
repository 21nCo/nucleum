export function findAncestorOrSelf(
  element: Element | null,
  selector: string
): Element | null {
  if (!element) return null;

  if (element.matches && element.matches(selector)) {
    return element;
  }
  let currentElement = element;
  while (currentElement) {
    if (
      currentElement.nodeType === Node.DOCUMENT_FRAGMENT_NODE &&
      currentElement.host
    ) {
      currentElement = currentElement.host;
    } else {
      currentElement = currentElement.parentNode;
    }
    if (!currentElement || currentElement === document) {
      return null;
    }
    if (currentElement.matches && currentElement.matches(selector)) {
      return currentElement;
    }
  }
  return null;
}

export function resolveParentNLevel(
  n: number,
  element: Element
): Element | null {
  const root = Array.from({ length: n }).reduce(
    (current, _) => current?.parentElement,
    element
  );
  return root;
}

export function resolveOgData(doc?: Document) {
  doc = doc ?? document;
  const ogTitle = (
    doc.querySelector("meta[property='og:title']") as HTMLMetaElement
  )?.content;
  const ogImage = (
    doc.querySelector("meta[property='og:image']") as HTMLMetaElement
  )?.content;
  const ogDescription = (
    doc.querySelector("meta[property='og:description']") as HTMLMetaElement
  )?.content;
  const ogUrl = (
    doc.querySelector("meta[property='og:url']") as HTMLMetaElement
  )?.content;
  const ogSiteName = (
    doc.querySelector("meta[property='og:site_name']") as HTMLMetaElement
  )?.content;
  return { ogTitle, ogImage, ogDescription, ogUrl, ogSiteName };
}

/**
 * UaData is causing below dexie error when insert -
 * Failed to execute 'put' on 'IDBObjectStore': NavigatorUAData object could not be cloned.
 DataCloneError: Failed to execute 'put' on 'IDBObjectStore': NavigatorUAData object could not be cloned.

 * @returns
 */
export function extractBrowserDetails() {
  const userAgent = navigator.userAgent;
  return { userAgent };
}

export function parseRelativeTimeToISO(relativeTime: string): string | null {
  // Convert relative time strings like "1d", "5h", "3w" to ISO date strings
  const now = new Date();
  const trimmed = relativeTime.trim().toLowerCase();

  // Match patterns like: 1d, 5h, 3w, 2mo, 1y
  const match = trimmed.match(/^(\d+)\s*([smhdwy]|mo)/);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const date = new Date(now);

  switch (unit) {
    case "s":
      date.setSeconds(date.getSeconds() - value);
      break;
    case "m":
      date.setMinutes(date.getMinutes() - value);
      break;
    case "h":
      date.setHours(date.getHours() - value);
      break;
    case "d":
      date.setDate(date.getDate() - value);
      break;
    case "w":
      date.setDate(date.getDate() - value * 7);
      break;
    case "mo":
      date.setMonth(date.getMonth() - value);
      break;
    case "y":
      date.setFullYear(date.getFullYear() - value);
      break;
    default:
      return null;
  }

  return date.toISOString();
}

export function parseFullDateTimeString(dateTimeString: string): Date | null {
  // Attempt to parse various date string formats
  try {
    // First, try direct parsing
    const date = new Date(dateTimeString);
    if (!isNaN(date.getTime())) {
      return date;
    }

    // Try parsing "Month Day, Year at Time" format (e.g., "January 1, 2023 at 12:34 PM")
    const monthDayYearMatch = dateTimeString.match(
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* (\d{1,2})(?:,? |, )(\d{4}) at (\d{1,2}:\d{2}(?: [AP]M)?)/i
    );

    if (monthDayYearMatch) {
      const parsedDate = new Date(
        `${monthDayYearMatch[1]} ${monthDayYearMatch[2]}, ${monthDayYearMatch[3]} ${monthDayYearMatch[4]}`
      );
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }

    // Try parsing relative time
    const relativeTimeISO = parseRelativeTimeToISO(dateTimeString);
    if (relativeTimeISO) {
      return new Date(relativeTimeISO);
    }

    return null;
  } catch (error) {
    console.error("Error parsing date string:", error);
    return null;
  }
}
