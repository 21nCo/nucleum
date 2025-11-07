import { TimeScaleUnit } from "@21n/types/time.type";
import { generateResourceId } from "@21n/components/flux/flux.utils";
import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import { CalendarColumnLayout, CalendarColumnPanel } from "./calendar.type";
import { Product } from "@21n/products/product.type";

export function resolveCalendarNotesId(date: Date, scale: TimeScaleUnit) {
  let idPart = "";
  if (scale === TimeScaleUnit.YEAR) {
    idPart = date.getFullYear().toString();
  } else if (scale === TimeScaleUnit.MONTH) {
    idPart =
      date.getFullYear().toString() +
      String(date.getMonth() + 1).padStart(2, "0");
  } else if (scale === TimeScaleUnit.WEEK) {
    //TODO - calculate for week
  } else if (scale === TimeScaleUnit.DAY) {
    idPart =
      date.getFullYear().toString() +
      String(date.getMonth() + 1).padStart(2, "0") +
      String(date.getDate()).padStart(2, "0");
  }
  idPart = "calendar_" + idPart;
  return generateResourceId(Resource.node, {
    id: idPart
  });
}

/**
 * Notes on timeline:
 * - Sub timeline (hours for a day, days for a week etc) - Time blocking/slotting
 * - Collapsible all-day events, tasks inbox (collapsible so that timeline is not crowded)
 * - Past days/periods - will be more restrospective, future days will have planned events, tasks etc - current day/period tries to show both
 * - Timeline will move out of panel switcher when enough width is available for the calendar column
 * @param product
 */
export function resolveCalendarColumnPanels(
  product: Product,
  layout: CalendarColumnLayout
) {
  const timeline = {
    label: "Timeline",
    value: CalendarColumnPanel.Timeline,
    icon: "clock"
  };
  const activity = {
    label: "Activity",
    value: CalendarColumnPanel.Activity,
    icon: "history"
  };
  const overview = {
    label: "Overview",
    value: CalendarColumnPanel.Overview,
    icon: "overview"
  };
  const notes = {
    label: "Notes",
    value: CalendarColumnPanel.Notes,
    icon: "note"
  };
  let items = [overview];
  switch (product) {
    case Product.POINTRON:
      items = [overview, activity];
      break;
    case Product.MEMOTRON:
      items = [notes, activity];
      break;
    case Product.NUCLEUS:
      items = [overview, notes, activity];
      break;
    default:
      items = [overview, activity];
  }
  if (layout === CalendarColumnLayout.TABS && product !== Product.MEMOTRON) {
    items = [timeline, ...items];
  }
  return items;
}
