import { todayFocusStore } from "./session.store";
import { AnalyticsPersistence } from "../analytics/analytics.persistence";
import { TimeScale } from "$lib/client/types/time.type";
import { sortArrayByOrder } from "$lib/client/utils/obj.utils";
import type { FocusItem } from "$lib/client/types/pointron/session.type";

export async function refreshTodayFocus() {
  let todayFocus =
    await new AnalyticsPersistence().fetchAggFocusByCurrentTimeHorizon(
      TimeScale.DAYS
    );
  todayFocusStore.set({ focus: todayFocus, streak: 0 });
}

export function transformFocusItems(rawItems: FocusItem[]) {
  let items: any[] = [];
  rawItems.forEach((item: FocusItem) => {
    if (item.goalId && !item.taskId) {
      let tasks = rawItems.filter(
        (x: FocusItem) => x.goalId === item.goalId && x.taskId
      );
      if (tasks && tasks.length > 0) {
        tasks = sortArrayByOrder(tasks);
        tasks = tasks.map((x: FocusItem) => {
          x.color = item.color;
          return x;
        });
        items = items.concat({ ...item, tasks });
      } else items = items.concat(item);
    } else if (!item.goalId && item.taskId) {
      items = items.concat(item);
    }
  });
  return sortArrayByOrder(items);
}
