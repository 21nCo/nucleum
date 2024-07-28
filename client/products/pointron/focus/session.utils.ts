import {
  BlockType,
  type ISessionInterval
} from "$lib/client/types/pointron/session.type";
import { deepCopy, sortArrayByOrder } from "$lib/shared/utils/obj.utils";
import { calculateTotalFocusAndBreak } from "../pointron.utils";

export function transformFocusItemsV1(rawItems: any[]) {
  let items: any[] = [];
  rawItems.forEach((item: any) => {
    if (item.goalId && !item.taskId) {
      let tasks = rawItems.filter(
        (x: any) => x.goalId === item.goalId && x.taskId
      );
      if (tasks && tasks.length > 0) {
        tasks = sortArrayByOrder(tasks);
        tasks = tasks.map((x: any) => {
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
export function resolveTotalTaskTime(
  focusItemBlocks: { start: number; end: number }[]
) {
  let totalFromBlocks = 0;
  if (focusItemBlocks && focusItemBlocks.length > 0) {
    totalFromBlocks = focusItemBlocks.reduce((acc, curr) => {
      return acc + ((curr.end ?? new Date().getTime()) - curr.start);
    }, 0);
  }
  return totalFromBlocks;
}

type FocusItemBlock = { start: number; end: number; type: BlockType };

export function resolveTaskFocus(
  sessionBlocks: ISessionInterval[],
  focusItemBlocks?: { start: number; end: number }[],
  currentStartTime?: number
) {
  // console.log({
  //   context: "resolveTaskFocus",
  //   sessionBlocks,
  //   focusItemBlocks,
  //   currentStartTime
  // });
  let focusFromPreviousBlocks = 0;
  let currentBlockFocus = 0;
  if (focusItemBlocks) {
    focusItemBlocks.forEach((block) => {
      const intervals = resolveIntervals(sessionBlocks, block.start, block.end);
      focusFromPreviousBlocks += calculateTotalFocusAndBreak(intervals).focus;
    });
  }
  // console.log({ focusFromPreviousBlocks });
  if (!currentStartTime) return focusFromPreviousBlocks;
  const intervalsForCurrentBlock = resolveIntervals(
    sessionBlocks,
    currentStartTime,
    new Date().getTime()
  );
  currentBlockFocus = calculateTotalFocusAndBreak(
    intervalsForCurrentBlock
  ).focus;
  // console.log({ currentBlockFocus });
  return focusFromPreviousBlocks + currentBlockFocus;

  function resolveIntervals(
    intervals: ISessionInterval[],
    start: number,
    end: number
  ) {
    let intervalsWithin: FocusItemBlock[] = [];
    let intervalMidwayLeft: FocusItemBlock | undefined;
    let intervalMidwayRight: FocusItemBlock | undefined;
    let intervalOverflow: FocusItemBlock | undefined;
    // let intervalCurrent: FocusItemBlock | undefined;
    intervals.forEach((interval, index) => {
      if (!interval?.start) return;
      if (interval.start > end) return;
      let intervalEnd = intervals[index + 1]?.start;
      if (!intervalEnd) {
        // if (props?.isCurrentBlock) {
        //   intervalCurrent = {
        //     start: interval.start,
        //     end: end,
        //     type: interval.type
        //   };
        //   return;
        // }
        intervalEnd = new Date().getTime();
      }
      if (
        interval.start >= start &&
        intervalEnd > start &&
        intervalEnd <= end
      ) {
        intervalsWithin.push({
          start: interval.start,
          end: intervalEnd,
          type: interval.type
        });
      }
      if (interval.start < start && intervalEnd > start && intervalEnd <= end) {
        intervalMidwayLeft = {
          start: start,
          end: intervalEnd,
          type: interval.type
        };
      }
      if (
        interval.start > start &&
        interval.start < end &&
        intervalEnd > start &&
        intervalEnd > end
      ) {
        intervalMidwayRight = {
          start: interval.start,
          end: end,
          type: interval.type
        };
      }
      if (interval.start < start && intervalEnd > end) {
        intervalOverflow = { start, end, type: interval.type };
      }
    });
    let result = [...intervalsWithin];
    if (intervalMidwayLeft) result.unshift(intervalMidwayLeft);
    if (intervalMidwayRight) result.push(intervalMidwayRight);
    if (intervalOverflow) result.push(intervalOverflow);
    return result;
  }
}
