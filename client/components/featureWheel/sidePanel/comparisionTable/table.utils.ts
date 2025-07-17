import { SourcingType } from "$lib/client/types/featureWheel.type";

export function mapValue(type: string, value: any) {
  if (type === "sourcingType") {
    return value === SourcingType.OPEN
      ? "Open source"
      : value === SourcingType.SOURCE_AVAILABLE
        ? "Source available"
        : value === SourcingType.PARTIAL
          ? "Partial"
          : value === SourcingType.CLOSED
            ? "Closed"
            : "Closed";
  }
  return value;
}
