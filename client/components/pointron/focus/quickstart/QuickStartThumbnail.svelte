<script lang="ts">
  import { startTouch, moveTouch } from "$lib/client/utils/touchGesture";
  import { swipeLabel } from "$lib/client/components/pointron/local.store";
  import { PointronEventEnum } from "$lib/client/types/pointron/pointronEvent.enum";
  import {
    focusItemsStore,
    sessionStore
  } from "$lib/client/components/pointron/focus/session.store";
  import type { Goal } from "$lib/client/types/pointron/goal.type";
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
  import { calculateTotalFocusAndBreak } from "$lib/client/components/pointron/local.utils";
  import Icon from "$lib/client/elements/Icon.svelte";
  import {
    appStore,
    leftThresholdCrossedStore,
    userPreferences
  } from "$lib/client/stores/app.store";
  import { Layout } from "$lib/client/types/layout.type";
  import { SelectionItemActiveStyle } from "$lib/client/types/switcher.enum";
  import { ColorStrength, ColorType } from "$lib/client/types/appearance.type";
  import { TimeFormat } from "$lib/client/types/time.type";
  import { customColorStyle } from "$lib/client/utils/theme.utils";
  import { formatTime, formatSeconds } from "$lib/client/utils/time.utils";
  import { onMount } from "svelte";
  import ActiveBackgroundElement from "$lib/client/elements/style/ActiveBackgroundElement.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { GoalPersistance } from "$lib/client/components/pointron/goals/goal.persistance";
  import appearance from "$lib/client/stores/appearance.store";
  import { pointLogStore } from "../../logs/log.store";
  export let goal: Pick<Goal, "id" | "label" | "color" | "parent"> & {
    focus?: number;
  };
  export let layout: Layout;
  export let refresh: any;
  let isColorGoalTextExperimental = false;
  let todayFocusDuration: number | undefined = undefined;
  let workedTime: number = 0;
  let parentLabels: string[] = [];
  let QSelement: any;
  let thresholdValue: number;
  let leftThresholdCrossed = false;
  let rightthresholdCrossed = false;
  let distance: any;
  let distanceWindow: number;
  let variableDistanceWindow: number;
  let resetTouchEvent = true;
  let goalPersistance = new GoalPersistance();
  let rem: number;
  function enableManualLog() {
    handleSwipeRightEndOnleftThresholdCrossed();
    resetTouchEvent = true;
    pointLogStore.reset();
    pointLogStore.addNewManualLog(goal.id);
    swipeLabel.set(goal.label);
    appStore.runAction(PointronEventEnum.MANUAL_FOCUS_ENTRY_POP);
  }
  $: isActive =
    goal.id === $sessionStore.currentLog.goalId && $sessionStore.isQuickStartOn;

  $: if (isActive || !isActive) {
    if (QSelement) {
      QSelement.style.setProperty("--width", "0px");
      rightthresholdCrossed = false;
    }
  }
  $: if (
    $leftThresholdCrossedStore != goal.id &&
    QSelement &&
    leftThresholdCrossed
  ) {
    leftThresholdCrossed = false;
    QSelement.style.setProperty("--width", "0px");
  }
  $: if (goal.focus) {
    todayFocusDuration = goal.focus;
  }
  $: color = goal.color ?? goal.parent?.color;

  onMount(async () => {
    QSelement = document.getElementById(goal.id);
    rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    distanceWindow = 10 * rem; //because each button widht(w-20) is 5rem
    variableDistanceWindow = distanceWindow;
    thresholdValue = distanceWindow / 1.8;
    if (goal.parent && goal.parent.hierarchy?.length > 0)
      parentLabels = goal.parent.hierarchy.map((x: any) => x.label) ?? [];
    sessionStore.subscribe((x: any) => {
      if (x.currentLog?.goalId === goal.id) {
        if (x.state == SessionState.FOCUS_RUNNING) {
          let item = $focusItemsStore.items.find((x) => x.goalId === goal.id);
          if (!item) return;
          let duration = calculateTotalFocusAndBreak(x.currentLog.blocks, true);
          workedTime = (+item.worked ?? 0) + duration.focus ?? item.worked;
        }
      }
    });
  });
  async function toggleSession() {
    if ($sessionStore.isSessionRunning) {
      if (isActive) {
        await sessionStore.finishSession(true);
      } else {
        await sessionStore.finishSession(true);
        await sessionStore.quickStart(goal.id, goal.label, color);
      }
    } else {
      await sessionStore.quickStart(goal.id, goal.label, color);
    }
  }
  function vibrate(duration: number) {
    if ("vibrate" in navigator) {
      navigator.vibrate(duration); //works only when a user interaction has already happened
    } else {
      console.log("Vibration is not supported in this browser.");
    }
  }
  function handleSwipeRightEndOnleftThresholdCrossed() {
    vibrate(50);
    resetTouchEvent = false;
    leftThresholdCrossed = false;
    variableDistanceWindow = distanceWindow;
    QSelement.style.setProperty("--width", "0px");
  }
  async function handleTouchMovements() {
    if (!resetTouchEvent) return;
    if (leftThresholdCrossed) {
      moveTouch(
        event,
        undefined,
        "pullRight",
        refresh,
        undefined,
        undefined
      ).then((value) => {
        if (!value) return;
        distance = value;
        if (distance < -thresholdValue) {
          handleSwipeRightEndOnleftThresholdCrossed();
          return;
        }
        variableDistanceWindow += distance;
        QSelement.style.setProperty("--width", `${variableDistanceWindow}px`);
        variableDistanceWindow = distanceWindow;
      });
      return;
    } else {
      moveTouch(
        event,
        undefined,
        "pullRight",
        refresh,
        "pullLeft",
        undefined
      ).then((value) => {
        if (!value) return;
        distance = value;
        if (distance < 0) {
          QSelement.style.setProperty("--width", `${Math.abs(distance)}px`);
          if (distance < -thresholdValue) {
            resetTouchEvent = false;
            $leftThresholdCrossedStore = goal.id;
            vibrate(50);
            rightthresholdCrossed = true;
            QSelement.style.setProperty("--width", "100%");
            toggleSession();
          }
          return;
        } else {
          if (distance > thresholdValue) {
            vibrate(50);
            leftThresholdCrossed = true;
            QSelement.style.setProperty("--width", `${distanceWindow}px`);
            $leftThresholdCrossedStore = goal.id;
            return;
          }
          if (!leftThresholdCrossed)
            QSelement.style.setProperty("--width", `${distance}px`);
        }
      });
    }
  }
  function handleTouchEnd() {
    if (
      !leftThresholdCrossed &&
      distance <= thresholdValue &&
      !rightthresholdCrossed
    ) {
      QSelement.style.setProperty("--width", "0px");
    }
    if (leftThresholdCrossed && distance >= -thresholdValue && distance < 0) {
      QSelement.style.setProperty("--width", `${distanceWindow}px`);
    }
    resetTouchEvent = true;
  }
  async function unpinGoal() {
    handleSwipeRightEndOnleftThresholdCrossed();
    resetTouchEvent = true;
    const response = await goalPersistance.updateIsPinnedForQuickStart(
      goal.id,
      false
    );
    if (response) {
      refresh();
    } else {
      console.log("error in unpinning: ", response);
    }
  }
</script>

{#if layout === Layout.LIST}
  <div
    id={goal.id}
    class="actualQSElement {distance < 0 && !leftThresholdCrossed
      ? 'ml-auto'
      : ''}"
    on:touchstart|stopPropagation={startTouch}
    on:touchmove|stopPropagation={handleTouchMovements}
    on:touchend|stopPropagation={handleTouchEnd}
  >
    <ActiveBackgroundElement
      class="flex justify-between h-16 min-h-[4rem] w-full items-center rounded-r-md pr-4 z-10"
      {color}
      isBackgroundActive={$sessionStore.isSessionRunning && isActive}
      bgWhenInactive={2}
      on:click={toggleSession}
    >
      <div class="flex gap-2 items-center h-full">
        <!-- {#if !($sessionStore.isSessionRunning && isActive)} -->
        <div
          class="w-0.5 h-full rounded-full"
          style={customColorStyle($appearance, ColorType.Bg, "fgs2", color)}
        />
        <!-- {/if} -->
        <div
          class="flex flex-col items-start"
          style={!($sessionStore.isSessionRunning && isActive) &&
          isColorGoalTextExperimental
            ? customColorStyle($appearance, ColorType.Fg, "fgs1", color)
            : ``}
        >
          {#if parentLabels.length > 0}
            <div class="text-start text-b4 truncate actualQSContent">
              {parentLabels.slice(-2).join(" ・ ")}
            </div>
          {/if}
          <div class="font-medium text-left truncate actualQSContent">
            {goal.label ?? ""}
          </div>
        </div>
      </div>

      {#if $sessionStore.isSessionRunning && isActive}
        <div class="flex flex-col items-end">
          <div class="flex items-center gap-1 text-b4">
            <div>
              {formatTime($userPreferences, $sessionStore.start ?? new Date())}
            </div>
            <Icon
              icon="arrow-right-mini"
              {isActive}
              selectionStyle={SelectionItemActiveStyle.ACCENT_BACKGROUND}
              bgColorHue={color}
            />
            <div>Now</div>
          </div>
          <div class="text-h3 leading-none">
            {formatSeconds(workedTime, TimeFormat.CLOCK)}
          </div>
        </div>
      {:else}
        <div class="text-b4">
          {todayFocusDuration
            ? "Today: " + formatSeconds(todayFocusDuration)
            : "Not focused today"}
        </div>
      {/if}
    </ActiveBackgroundElement>
  </div>
  <div
    class="relativeQSThumbnailL1"
    class:relativeQSThumbnailL1Custom={rightthresholdCrossed}
  >
    <ActiveBackgroundElement
      class="flex justify-between h-16 min-h-[4rem] items-center w-full rounded-r-md pr-4 relative"
      isBackgroundActive={!($sessionStore.isSessionRunning && isActive)}
      {color}
    >
      <div class="flex p-2 gap-3 text-white w-3/10" class:hidden={isActive}>
        <Icon icon="play" color="white" />Start
      </div>
      <div class="flex p-2 gap-3 text-fgs4 w-3/10" class:hidden={!isActive}>
        <Icon icon="arrow-right-circled" color="fgs4" />Finish
      </div></ActiveBackgroundElement
    >
  </div>
  <div class="relativeQSThumbnailL2">
    <ActiveBackgroundElement
      class="flex justify-between h-16 min-h-[4rem] items-center w-full rounded-r-md pr-4 relative"
      isBackgroundActive={true}
      color={225}
    >
      <div class="absolute right-0 flex divide-x-2 divide-inherit text-white">
        <button
          class="flex flex-col w-20 items-center text-xs p-2"
          on:click={unpinGoal}
        >
          <Icon icon="unpin" color="white" />unpin</button
        >
        <button
          class="flex flex-col w-20 items-center text-xs p-2"
          on:click={enableManualLog}
        >
          <Icon icon="plus" color="white" />manual log</button
        >
      </div></ActiveBackgroundElement
    >
  </div>
{:else}
  <ActiveBackgroundElement
    class="flex justify-between rounded-md h-16
      flex-col items-start w-1/3 p-2"
    styles="width: calc(50% - 0.33rem);"
    bgWhenInactive={-1}
    {color}
    isBackgroundActive={$sessionStore.isSessionRunning && isActive}
    on:click={toggleSession}
    transition="ease"
  >
    <div class="flex gap-2 items-center">
      <div class="flex flex-col items-start">
        <div class="text-left text-b2 truncate w-40 md:w-40">
          {goal.label ?? ""}
        </div>
      </div>
    </div>
    {#if $sessionStore.isSessionRunning && isActive}
      <div class="flex w-full justify-between text-h4">
        <!-- <div class="flex items-center gap-1 text-b5">
          <div>
            {formatTime($sessionStore.start ?? new Date())}
          </div>
        </div> -->
        <div class="leading-none">
          {formatSeconds(workedTime, TimeFormat.CLOCK)}
        </div>
      </div>
    {:else}
      <div class="text-b5 text-fgs2">
        {todayFocusDuration
          ? formatSeconds(todayFocusDuration) + " today"
          : "Not focused today"}
      </div>
    {/if}
  </ActiveBackgroundElement>
{/if}

<style>
  .actualQSElement {
    width: calc(100% - var(--width, 0px));
    z-index: 10;
    /* transition: width 0.1s ease-in-out; */
  }
  .actualQSContent {
    width: calc(200px - var(--width, 0px));
    /* transition: width 0.1s ease-in-out; */
  }
  .relativeQSThumbnailL1 {
    position: relative;
    top: -4.75rem;
    margin-bottom: -4.75rem;
    z-index: 5;
    width: 10rem;
  }
  .relativeQSThumbnailL2 {
    position: relative;
    top: -4.75rem;
    margin-bottom: -4.75rem;
    right: 0%;
  }
  .relativeQSThumbnailL1Custom {
    width: 100%;
  }
</style>
