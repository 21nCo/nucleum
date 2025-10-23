import { ResourceStore } from "@21n/components/flux/resourceStores/resource.store";
import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import type { ITimezone, ITimezoneCapture } from "@21n/components/settings/timezone/tz.type";
import { TimeScaleUnit, type TimePeriod } from "@21n/types/time.type";
import { determineTimePeriodv2 } from "@21n/utils/time.utils";
import { resolveUnixTimestamp } from "@21n/shared-utils/time.utils";

class TimezoneStore extends ResourceStore<ITimezone, ITimezoneCapture> {
  constructor() {
    super(Resource.tz);
  }

  resolveTimePeriodFilter(
    day: Date,
    params?: {
      scale?: TimeScaleUnit;
      isReturnAsDateObjectFilter?: boolean;
    }
  ) {
    const scale = params?.scale ?? TimeScaleUnit.DAY;
    let result: any;
    if (scale === TimeScaleUnit.DAY) {
      result = this.resolveTimePeriodFilterForDay(day);
    } else if (scale === TimeScaleUnit.MONTH) {
      result = this.resolveTimePeriodFilterForMonth(day);
    } else if (scale === TimeScaleUnit.YEAR) {
      result = this.resolveTimePeriodFilterForYear(day);
    }
    if (!params?.isReturnAsDateObjectFilter) return result;
    else {
      return {
        greaterThanOrEqual: new Date(result.greaterThanOrEqual),
        lessThanOrEqual: new Date(result.lessThanOrEqual)
      };
    }
  }

  resolveTimePeriodFilterForDay(day: Date) {
    const localDay = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const end = new Date(localDay.getTime() + 24 * 60 * 60 * 1000);
    return this.resolveCorrectedTimePeriodFilter({
      begin: resolveUnixTimestamp(localDay),
      end: resolveUnixTimestamp(end)
    });
  }

  resolveTimePeriodFilterForMonth(day: Date) {
    const localDay = new Date(day.getFullYear(), day.getMonth(), 1);
    const end = new Date(localDay.getFullYear(), localDay.getMonth() + 1, 1);
    return this.resolveCorrectedTimePeriodFilter({
      begin: resolveUnixTimestamp(localDay),
      end: resolveUnixTimestamp(end)
    });
  }

  resolveTimePeriodFilterForYear(day: Date) {
    const localDay = new Date(day.getFullYear(), 0, 1);
    const end = new Date(day.getFullYear(), 11, 31);
    return this.resolveCorrectedTimePeriodFilter({
      begin: resolveUnixTimestamp(localDay),
      end: resolveUnixTimestamp(end)
    });
  }

  private resolveCorrectedTimePeriodFilter(period: {
    begin: number;
    end: number;
  }) {
    const corrected = this.resolveTimePeriodCorrectedByTz(period);
    return {
      greaterThanOrEqual: corrected.begin,
      lessThanOrEqual: corrected.end
    };
  }
  /**
   * Resolves the timezone corrected time period
   * @param period - The period to resolve
   * @param params - The parameters
   * @returns The timezone corrected time period
   */
  resolveTimePeriodCorrectedByTz(
    period: { begin: number; end: number } | TimePeriod,
    params?: {
      tzRecords?: ITimezone[];
    }
  ) {
    let begin = 0;
    let end = 0;
    let resolvedTimePeriod: any;
    if ("value" in period) {
      resolvedTimePeriod = determineTimePeriodv2(period);
      begin = resolveUnixTimestamp(resolvedTimePeriod.begin);
      end = resolveUnixTimestamp(resolvedTimePeriod.end);
    } else {
      begin = period.begin;
      end = period.end;
    }
    const correctedBegin = this.resolveTimezoneCorrectedTimestamp(
      begin,
      params
    );
    const correctedEnd = this.resolveTimezoneCorrectedTimestamp(end, params);
    return {
      begin,
      end,
      resolvedTimePeriod,
      correctedBegin,
      correctedEnd
    };
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
    let tzRecords = params?.tzRecords ?? this.get();
    if (!tzRecords) return timestamp;
    tzRecords = tzRecords.filter((x) => x.dateUnix);
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

export const tzStore = TimezoneStore.resolve(Resource.tz);
