import { TimeScaleUnit } from "@21n/shared-utils/datetime/period.type";
import { Product } from "@nucleum/client/config/product.type";
import { CalendarLayout } from "@nucleum/features/calendar/calendar.type";
import type { PageViewSegment } from "@nucleum/shared-state/commands/page-view-actions";

/** Classic calendar heatmap option value shown by the scale selector. */
export const CALENDAR_HEATMAP_SCALE = "heatmap";

/** Scale values selectable in a calendar layout. */
export type CalendarScale = TimeScaleUnit | typeof CALENDAR_HEATMAP_SCALE;

/** Calendar view encoded in the `calendar/<layout>/<scale>` path. */
export type CalendarView = {
  layout: CalendarLayout;
  scale: CalendarScale;
};

const layoutSegments: Partial<Record<CalendarLayout, PageViewSegment>> = {
  [CalendarLayout.Classic]: { slug: "classic", label: "Classic" },
  [CalendarLayout.Bird]: { slug: "columns", label: "Columns" }
};

const scaleLabels: Record<CalendarScale, string> = {
  [TimeScaleUnit.PART]: "Part",
  [TimeScaleUnit.DAY]: "Day",
  [TimeScaleUnit.WEEK]: "Week",
  [TimeScaleUnit.MONTH]: "Month",
  [TimeScaleUnit.QUARTER]: "Quarter",
  [TimeScaleUnit.YEAR]: "Year",
  [CALENDAR_HEATMAP_SCALE]: "Heatmap"
};

/** Layouts offered by the layout switcher for a product. */
export function resolveCalendarLayouts(
  product: Product,
  isDev: boolean
): CalendarLayout[] {
  return product === Product.NUCLEUM && isDev
    ? [CalendarLayout.Bird, CalendarLayout.Classic]
    : [CalendarLayout.Classic];
}

/** Scales offered by a layout's scale selector for a product. */
export function resolveCalendarScales(
  product: Product,
  layout: CalendarLayout,
  isDev: boolean
): CalendarScale[] {
  if (layout === CalendarLayout.Bird) {
    return [
      TimeScaleUnit.PART,
      TimeScaleUnit.DAY,
      TimeScaleUnit.WEEK,
      TimeScaleUnit.MONTH,
      TimeScaleUnit.YEAR
    ];
  }
  if (product === Product.MEMOTRON) {
    return [TimeScaleUnit.MONTH, TimeScaleUnit.YEAR];
  }
  return [
    TimeScaleUnit.DAY,
    ...(isDev ? [TimeScaleUnit.WEEK] : []),
    TimeScaleUnit.MONTH,
    TimeScaleUnit.YEAR,
    ...(isDev ? [CALENDAR_HEATMAP_SCALE] : [])
  ] as CalendarScale[];
}

/** URL slug for a calendar layout. */
export function calendarLayoutSlug(layout: CalendarLayout) {
  return layoutSegments[layout]?.slug ?? layout;
}

/** URL slug for a calendar scale. */
export function calendarScaleSlug(scale: CalendarScale) {
  return scale.toLowerCase();
}

/** Path segments after `calendar` for a view. */
export function calendarViewSubPath(view: CalendarView): string[] {
  return [calendarLayoutSlug(view.layout), calendarScaleSlug(view.scale)];
}

/** Reads the layout segment when the product renders that layout. */
export function parseCalendarLayout(
  slug: string | undefined,
  product: Product,
  isDev: boolean
): CalendarLayout | undefined {
  if (!slug) return;
  return resolveCalendarLayouts(product, isDev).find(
    (layout) => calendarLayoutSlug(layout) === slug.toLowerCase()
  );
}

/** Reads the scale segment when the layout offers that scale. */
export function parseCalendarScale(
  slug: string | undefined,
  product: Product,
  layout: CalendarLayout,
  isDev: boolean
): CalendarScale | undefined {
  if (!slug) return;
  return resolveCalendarScales(product, layout, isDev).find(
    (scale) => calendarScaleSlug(scale) === slug.toLowerCase()
  );
}

/** Every layout and scale combination a product renders, as page view segments. */
export function resolveCalendarViewSegments(
  product: Product,
  isDev: boolean
): PageViewSegment[][] {
  return resolveCalendarLayouts(product, isDev).flatMap((layout) =>
    resolveCalendarScales(product, layout, isDev).map((scale) => [
      layoutSegments[layout] ?? { slug: layout, label: layout },
      { slug: calendarScaleSlug(scale), label: scaleLabels[scale] }
    ])
  );
}
