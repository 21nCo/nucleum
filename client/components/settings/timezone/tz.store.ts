import { ResourceStore } from "../../flux/resourceStores/resource.store";
import { Resource } from "../../flux/resourceStores/resource.enum";
import type { ITimezone } from "./tz.type";

class TimezoneStore extends ResourceStore<ITimezone> {
  constructor() {
    super(Resource.tz, {
      isInMemory: true
    });
  }

  /**
   * Resolves the timezone corrected timestamp
   * @param timestamp - The timestamp to resolve (in milliseconds)
   * @param params - The parameters
   * @returns The timezone corrected timestamp (in milliseconds)
   */
  resolveTimezoneCorrectedTimestamp(
    timestamp: number,
    params?: {
      tzRecords?: ITimezone[];
    }
  ) {
    const tzRecords = params?.tzRecords ?? this.get();
    if (!tzRecords) return timestamp;
    const tzStoreSorted = tzRecords.sort((a, b) => b.dateUnix - a.dateUnix);
    const currentTzOffset = tzStoreSorted[0]?.offset;
    let timezoneOffset = tzStoreSorted.find((x) => x.dateUnix < timestamp);
    if (!timezoneOffset) {
      const tzStoreSortedAsc = tzRecords.sort(
        (a, b) => a.dateUnix - b.dateUnix
      );
      timezoneOffset = tzStoreSortedAsc.find((x) => x.dateUnix > timestamp);
    }
    return (
      timestamp + (timezoneOffset?.offset ?? 0) * 1000 - currentTzOffset * 1000
    );
  }
}

export const tzStore = new TimezoneStore();
