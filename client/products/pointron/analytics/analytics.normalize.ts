import {
  AnalyticsCardGrouping,
  AnalyticsCardType,
  type AnalyticsPage,
  type IAnalyticsCard,
  type IAnalyticsConfigStore
} from "@21n/products/pointron/analytics/analytics.types";
import { generateSimpleRandomId } from "@21n/shared-utils/crypto.utils";
import { TimePeriodType, TimeScale, type TimePeriod } from "@21n/types/time.type";

function resolveDefaultPeriod(): TimePeriod {
  return {
    scale: TimeScale.DAYS,
    value: {
      type: TimePeriodType.RELATIVE,
      param: 0
    }
  };
}

function resolvePeriod(period: unknown): TimePeriod {
  if (!period || typeof period !== "object") {
    return resolveDefaultPeriod();
  }
  const candidate = period as Partial<TimePeriod>;
  const scale = Object.values(TimeScale).includes(candidate.scale as TimeScale)
    ? (candidate.scale as TimeScale)
    : TimeScale.DAYS;
  const value =
    candidate.value && typeof candidate.value === "object"
      ? candidate.value
      : resolveDefaultPeriod().value;
  return {
    scale,
    value
  };
}

export function normalizeAnalyticsCard(card: unknown): IAnalyticsCard | undefined {
  if (!card || typeof card !== "object") {
    return undefined;
  }
  const candidate = card as Partial<IAnalyticsCard>;
  const type = Object.values(AnalyticsCardType).includes(
    candidate.type as AnalyticsCardType
  )
    ? (candidate.type as AnalyticsCardType)
    : AnalyticsCardType.DONUT;
  const grouping = Object.values(AnalyticsCardGrouping).includes(
    candidate.grouping as AnalyticsCardGrouping
  )
    ? (candidate.grouping as AnalyticsCardGrouping)
    : undefined;
  return {
    id:
      typeof candidate.id === "string" && candidate.id.length > 0
        ? candidate.id
        : generateSimpleRandomId(),
    label: typeof candidate.label === "string" ? candidate.label : undefined,
    grouping,
    filter: Array.isArray(candidate.filter)
      ? candidate.filter.filter(
          (value): value is string => typeof value === "string" && value.length > 0
        )
      : undefined,
    type,
    period: resolvePeriod(candidate.period),
    isGroupByTopLevelGoals:
      typeof candidate.isGroupByTopLevelGoals === "boolean"
        ? candidate.isGroupByTopLevelGoals
        : undefined,
    stackedBarMode:
      candidate.stackedBarMode === "percentage" ||
      candidate.stackedBarMode === "value"
        ? candidate.stackedBarMode
        : undefined
  };
}

export function normalizeAnalyticsPage(
  page: unknown,
  index: number
): AnalyticsPage | undefined {
  if (!page || typeof page !== "object") {
    return undefined;
  }
  const candidate = page as Partial<AnalyticsPage>;
  const cards = Array.isArray(candidate.cards)
    ? candidate.cards
        .map((card) => normalizeAnalyticsCard(card))
        .filter((card): card is IAnalyticsCard => Boolean(card))
    : [];
  return {
    id:
      typeof candidate.id === "string" && candidate.id.length > 0
        ? candidate.id
        : generateSimpleRandomId(),
    label:
      typeof candidate.label === "string" && candidate.label.trim().length > 0
        ? candidate.label
        : `View ${index + 1}`,
    cards
  };
}

export function normalizeAnalyticsConfig(
  config: unknown,
  seedPages: AnalyticsPage[]
): IAnalyticsConfigStore {
  const pages =
    config && typeof config === "object" && Array.isArray((config as any).pages)
      ? (config as { pages: unknown[] }).pages
          .map((page, index) => normalizeAnalyticsPage(page, index))
          .filter((page): page is AnalyticsPage => Boolean(page))
      : [];
  if (pages.length === 0) {
    return {
      pages: seedPages
    };
  }
  return {
    pages
  };
}
