import { get } from "svelte/store";
import {
  SessionCompositionType,
  type SessionComposition,
  BreakCompositionType
} from "$lib/client/types/pointron/sessionComposition.type";
import {
  type ISessionInterval,
  BlockType
} from "$lib/client/types/pointron/session.type";
import type { ITag } from "$lib/client/types/pointron/tag.type";
import { sessionStore } from "./focus/session.store";
import { generateUID } from "$lib/client/utils/utils";

// export function aggregateFocusFromSessions(sessions: PointSessionDbType[]) {
//   let focus = 0;
//   sessions.forEach((session) => {
//     if (session.blocks === undefined && session.focus) focus += session.focus;
//     else if (session.blocks)
//       focus += calculateTotalFocusAndBreakOld(session.blocks).totalFocusTime;
//   });
//   return focus;
// }

export function getTotalsFromComposition(
  params: {
    composition?: SessionComposition | undefined;
    intervals?: ISessionInterval[] | undefined;
  } = {
    composition: undefined,
    intervals: undefined
  }
) {
  let { intervals, composition } = params;
  if (!intervals && composition)
    intervals = generateIntervalsFromComposition(composition);
  if (!intervals) return { duration: 0, focus: 0, brek: 0 };
  let duration = intervals.reduce((sum, item) => sum + (item.duration ?? 0), 0);
  let focus = intervals.reduce(
    (sum, item) =>
      sum + (item.type === BlockType.FOCUS ? item.duration ?? 0 : 0),
    0
  );
  let brek = intervals.reduce(
    (sum, item) =>
      sum + (item.type === BlockType.BREAK ? item.duration ?? 0 : 0),
    0
  );
  return { duration, focus, brek };
}
export function generateIntervalsFromComposition(
  composition: SessionComposition
) {
  let bars: Omit<ISessionInterval, "start">[] = [];
  let intervals: ISessionInterval[] = [];
  if (!composition) return intervals;
  if (
    (composition?.numberOfFocusRounds &&
      composition.numberOfFocusRounds > 100) ||
    (composition?.numberOfBreaks && composition.numberOfBreaks > 100)
  ) {
    return intervals;
  }
  bars = generateIntervals(composition);
  if (composition.additional && composition.additional.length > 0) {
    composition.additional.forEach((p) => {
      bars = [...bars, ...generateIntervals(p)];
    });
  }
  if (bars.length > 0) {
    bars.forEach((bar, index) => {
      if (index == 0) {
        intervals = [
          {
            ...bar,
            start: new Date().getTime()
          }
        ];
        return;
      }
      const previousBar = intervals[index - 1];
      intervals = [
        ...intervals,
        {
          ...bar,
          start: previousBar.start + previousBar.duration * 1000
        }
      ];
    });
  }
  return intervals;
}

function generateIntervals(composition: SessionComposition) {
  if (!composition) return [];
  let focusDuration;
  let numberOfFocusRounds;
  if (
    composition.type === SessionCompositionType.POMODORO &&
    composition.numberOfFocusRounds
  ) {
    focusDuration = composition.focusDuration;
    numberOfFocusRounds = composition.numberOfFocusRounds;
  } else if (composition.type === SessionCompositionType.TARGET_FOCUS) {
    if (
      composition.breakType === BreakCompositionType.PREDEFINED &&
      composition.numberOfBreaks &&
      composition.breakDuration
    ) {
      numberOfFocusRounds = composition.numberOfBreaks + 1;
      focusDuration = composition.focusDuration / numberOfFocusRounds;
    } else {
      numberOfFocusRounds = 1;
      focusDuration = composition.focusDuration;
    }
  } else if (
    composition.type === SessionCompositionType.TOTAL_DURATION &&
    composition.totalDuration
  ) {
    if (
      composition.breakType === BreakCompositionType.PREDEFINED &&
      composition.numberOfBreaks &&
      composition.breakDuration
    ) {
      let totalFocusDuration =
        composition.totalDuration -
        composition.numberOfBreaks * composition.breakDuration;
      numberOfFocusRounds = composition.numberOfBreaks + 1;
      focusDuration = totalFocusDuration / numberOfFocusRounds;
    } else {
      focusDuration = composition.totalDuration;
      numberOfFocusRounds = 1;
    }
  } else if (composition.type === SessionCompositionType.END_TIME_FIXED) {
    const endTime = get(sessionStore).end;
    if (!endTime) return [];
    if (
      composition.breakType === BreakCompositionType.PREDEFINED &&
      composition.numberOfBreaks &&
      composition.breakDuration
    ) {
      numberOfFocusRounds = composition.numberOfBreaks + 1;
      focusDuration =
        (Math.round((endTime.getTime() - new Date().getTime()) / 1000) -
          composition.breakDuration * (composition.numberOfBreaks ?? 1)) /
        numberOfFocusRounds;
    } else {
      focusDuration = Math.round(
        (endTime.getTime() - new Date().getTime()) / 1000
      );
      numberOfFocusRounds = 1;
    }
  } else if (composition.focusDuration) {
    focusDuration = composition.focusDuration;
    numberOfFocusRounds = 1;
  }
  if (!focusDuration || !numberOfFocusRounds) return [];
  let bars: Omit<ISessionInterval, "start">[] = [];
  for (let i = 0; i < numberOfFocusRounds; i++) {
    bars = [
      ...bars,
      {
        id: generateUID(),
        duration: focusDuration,
        progress: 0,
        type: BlockType.FOCUS
      }
    ];
    if (
      composition.breakDuration > 0 &&
      !(
        i === numberOfFocusRounds - 1 &&
        (composition.additional === undefined ||
          composition.additional.length < 1)
      )
    ) {
      bars = [
        ...bars,
        {
          id: generateUID(),
          duration: composition.breakDuration,
          progress: 0,
          type: BlockType.BREAK
        }
      ];
    }
  }
  return bars;
}

export function sessionTotals(sessionLog: any) {
  let totalFocus = 0;
  let totalBreak = 0;
  if (!sessionLog.blocks || sessionLog.blocks.length == 0) {
    totalFocus = sessionLog.elapsed;
  } else {
    const result = calculateTotalFocusAndBreak(sessionLog.blocks);
    totalFocus = result.focus;
    totalBreak = result.brek;
  }
  return { totalFocus, totalBreak };
}

export function calculateTotalFocusAndBreak(
  blocks: { start: number; end?: number; type: BlockType }[]
) {
  let focus = 0;
  let brek = 0;
  if (!blocks || blocks.length < 0) return { focus: 0, brek: 0 };
  blocks.forEach((element, index) => {
    if (!element) return;
    if (element.type === BlockType.FOCUS) {
      if (!element.start) return;
      const end = element.end ?? blocks[index + 1]?.start;
      if (!end) {
        const duration = new Date().getTime() - element.start;
        focus += duration;
      } else {
        const duration = end - element.start;
        focus += duration;
      }
    }
    if (element.type === BlockType.BREAK) {
      if (!element.start) return;
      const end = element.end ?? blocks[index + 1]?.start;
      if (!end) {
        const duration = new Date().getTime() - element.start;
        brek += duration;
      } else {
        const duration = end - element.start;
        brek += duration;
      }
    }
  });
  return {
    focus: focus / 1000,
    brek: brek / 1000
  };
}

export function calculateTotalFocusAndBreakOld(blocks: any) {
  let totalFocusTime = 0;
  let totalBreakTime = 0;
  for (let i = 0; i < blocks.length - 1; i++) {
    if (blocks[i].type === BlockType.FOCUS) {
      const startTime = blocks[i].start;
      const nextStartTime = blocks[i + 1].start;
      if (!startTime || !nextStartTime) continue;
      const duration = nextStartTime - startTime;
      totalFocusTime += duration;
    }
    if (blocks[i].type === BlockType.BREAK) {
      const startTime = blocks[i].start;
      const nextStartTime = blocks[i + 1].start;
      if (!startTime || !nextStartTime) continue;
      const duration = nextStartTime - startTime;
      totalBreakTime += duration;
    }
  }
  return {
    totalFocusTime: totalFocusTime / 1000,
    totalBreakTime: totalBreakTime / 1000
  };
}

export function roundOffToNdigitsAfterDecimal(number: number, n: number) {
  return Math.round(number * Math.pow(10, n)) / Math.pow(10, n);
}

export function addHashToTagLabel(tag: ITag) {
  return {
    ...tag,
    label: `#${tag.label}`
  };
}

export function refreshFocusDurationForFixedEndTime(
  composition: SessionComposition,
  endTime: Date
) {
  composition.focusDuration =
    (endTime.getTime() - new Date().getTime()) / 1000 -
    composition.breakDuration * (composition.numberOfBreaks ?? 1);
  return composition;
}
