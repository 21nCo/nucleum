<script lang="ts">
  import { startTouch, moveTouch } from "$lib/client/utils/touchGesture";
  import { swipeLabel } from "$lib/client/products/pointron/pointron.store";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  import { sessionStore } from "$lib/client/products/pointron/focus/session.store";
  import type { IGoal } from "$lib/client/types/pointron/goal.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  import {
    appStore,
    leftThresholdCrossedStore,
    userPreferences
  } from "$lib/client/stores/app.store";
  import { Layout } from "$lib/client/types/layout.type";
  import { TimeFormat } from "$lib/client/types/time.type";
  import { formatTime, formatSeconds } from "$lib/client/utils/time.utils";
  import { onMount } from "svelte";
  import { GoalPersistence } from "$lib/client/products/pointron/goals/goal.persistence";
  import { manualLogStore } from "../../logs/log.store";
  import BreadcrumbMini from "$lib/client/elements/breadcrumb/BreadcrumbMini.svelte";
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { resolveTaskFocus } from "../session.utils";
  import HoverableElement from "$lib/client/elements/HoverableElement.svelte";
  import { goalStore } from "../../goals/goal.store";
  import UnpinAction from "./actions/UnpinAction.svelte";
  import { toasts } from "$lib/client/stores/notification.store";
  export let goal: Pick<IGoal, "id" | "label" | "color" | "parent"> & {
    focus?: number;
  };
  export let layout: Layout;
  export let refresh: any;
  export let isInEditMode: boolean = false;
  let isColorGoalTextExperimental = false;
  let todayFocusDuration: number | undefined = undefined;
  let parentLabels: string[] = [];
  let QSelement: any;
  let thresholdValue: number;
  let leftThresholdCrossed = false;
  let rightthresholdCrossed = false;
  let distance: any;
  let distanceWindow: number;
  let variableDistanceWindow: number;
  let resetTouchEvent = true;
  let goalPersistance = new GoalPersistence();
  let rem: number;
  let focusTime: number;
  let isHovering = false;
  let isFinishingState: boolean = false;
  function enableManualLog() {
    handleSwipeRightEndOnleftThresholdCrossed();
    resetTouchEvent = true;
    manualLogStore.reset();
    manualLogStore.addNewManualLog(goal.id);
    swipeLabel.set(goal.label);
    appStore.runAction(PointronAction.MANUAL_FOCUS_ENTRY_POP);
  }
  $: isActive =
    goal.id === $sessionStore.currentTask?.id &&
    $sessionStore.isQuickStartOn &&
    $sessionStore.isSessionRunning;
  $: if (isActive) {
    focusTime = resolveTaskFocus(
      $sessionStore.intervals,
      undefined,
      $sessionStore.currentTask?.start
    );
    // console.log({
    //   focusTime,
    //   blocks: $sessionStore.intervals,
    //   sessionStore: $sessionStore
    // });
  }

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
  });
  async function toggleSession() {
    if (isInEditMode) return;
    isFinishingState = true;
    if (isActive) {
      await sessionStore.finishSession(true);
    } else {
      if ($sessionStore.isSessionRunning)
        await sessionStore.finishSession(true);
      await sessionStore.quickStart(goal.id);
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
  async function unPin() {
    await goalStore.modify({ id: goal.id, isPinnedForQuickStart: false });
    toasts.success(`Goal **${goal.label}** unpinned from quick focus`);
    refresh();
  }
</script>

{#if layout === Layout.LIST}
  <!--     on:touchstart|stopPropagation={startTouch}
    on:touchmove|stopPropagation={handleTouchMovements}
    on:touchend|stopPropagation={handleTouchEnd} -->
  <HoverableElement
    id={goal.id}
    type="button"
    bind:isHovering
    class="relative cursor-pointer actualQSElement {distance < 0 &&
    !leftThresholdCrossed
      ? 'ml-auto'
      : ''}"
  >
    <CustomColorPropagator
      class={cn(
        "flex justify-between h-16 min-h-[4rem] w-full items-center rounded-md  z-10",
        {
          "px-3": isActive || isInEditMode,
          "bg-ccs1": isActive && !isInEditMode,
          "bg-bgs2 hover:bg-bgs3 pr-3": !isActive && !isInEditMode,
          "border-[1.5px] border-dashed border-ccs1 hover:bg-bgs2": isInEditMode
        }
      )}
      {color}
      on:click={toggleSession}
    >
      <div class="flex gap-2 items-center h-full">
        {#if !isActive && !isInEditMode}
          <div
            class={cn("w-0.5 h-8 ml-0.5 rounded-full", {
              "bg-ccs1": color,
              "bg-fgs2": !color
            })}
          />
        {/if}
        <div
          class={cn("flex flex-col items-start", {
            "text-ccs1": !isActive && isColorGoalTextExperimental,
            "text-fgs1": !isActive
          })}
        >
          <!-- {#if parentLabels.length > 0}
            <div class="text-start text-b4 truncate actualQSContent">
              {parentLabels.slice(-2).join(" ・ ")}
            </div>
          {/if} -->
          {#key parentLabels}
            <div
              class={cn({
                "text-fgs3": !isActive
              })}
            >
              <BreadcrumbMini hierarchy={parentLabels} slice={2} />
            </div>
          {/key}
          <div
            class="font-medium text-left flex items-center gap-2 truncate actualQSContent"
          >
            <!-- {#if !isActive}
              <div class="w-2 h-2 bg-ccs1 rounded-full"></div>
            {/if} -->
            <div>
              {goal.label ?? ""}
            </div>
          </div>
        </div>
      </div>

      {#if isActive && $sessionStore.currentTask}
        <div class="flex flex-col items-end">
          <div class="flex items-center gap-1 text-b4">
            <div>
              {formatTime($userPreferences, $sessionStore.start ?? new Date())}
            </div>
            <Icon icon="arrow-right-mini" isCustomBgContext={isActive} />
            <div>Now</div>
          </div>
          <div class="text-h3 leading-none">
            {formatSeconds(focusTime, TimeFormat.CLOCK)}
          </div>
        </div>
      {:else}
        <div class="text-b4">
          {isFinishingState
            ? "Finishing session..."
            : isHovering && !isInEditMode
              ? "Click to start"
              : todayFocusDuration
                ? "Today: " + formatSeconds(todayFocusDuration)
                : "Not focused today"}
        </div>
      {/if}
    </CustomColorPropagator>
    {#if isInEditMode}
      <UnpinAction on:click={unPin} />
    {/if}
  </HoverableElement>
  <!-- <div
    class="relativeQSThumbnailL1"
    class:relativeQSThumbnailL1Custom={rightthresholdCrossed}
  >
    <CustomColorPropagator
      class={cn(
        "flex justify-between h-16 min-h-[4rem] items-center w-full rounded-r-md pr-4 relative",
        {
          "bg-ccs1": !isActive
        }
      )}
      {color}
    >
      <div class="flex p-2 gap-3 text-cbg w-3/10" class:hidden={isActive}>
        <Icon icon="play" class="stroke-cbg" />Start
      </div>
      <div class="flex p-2 gap-3 text-fgs4 w-3/10" class:hidden={!isActive}>
        <Icon icon="arrow-right-circled" class="stroke-fgs4" />Finish
      </div></CustomColorPropagator
    >
  </div>
  <div class="relativeQSThumbnailL2">
    <div
      class="flex justify-between h-16 min-h-[4rem] items-center w-full rounded-r-md pr-4 relative bg-ass1"
    >
      <div class="absolute right-0 flex divide-x-2 divide-inherit text-abg">
        <button
          class="flex flex-col w-20 items-center text-xs p-2"
          on:click={unpinGoal}
        >
          <Icon icon="unpin" class="stroke-abg" />unpin</button
        >
        <button
          class="flex flex-col w-20 items-center text-xs p-2"
          on:click={enableManualLog}
        >
          <Icon icon="plus" class="stroke-abg" />manual log</button
        >
      </div>
    </div>
  </div> -->
{:else}
  <!-- TODO - dark:bg-ccs3 isn't working due to bg-cc classes implementation. replacing `bg-ccs4 dark:bg-ccs3` with regular bg classes `bg-bgs1 dark:bg-bgs2` works -->
  <CustomColorPropagator
    type="button"
    class={cn("relative flex rounded-md h-[4.3rem] p-2 transition-ease", {
      "bg-ccs1 border border-ccs1": isActive && !isInEditMode,
      "bg-ccs4 dark:bg-ccs3 border border-ccs2": !isActive && !isInEditMode,
      "border-[1.5px] border-dashed border-ccs1 dark:border-ccs2 hover:bg-bgs2":
        isInEditMode
    })}
    {color}
    on:click={toggleSession}
  >
    <HoverableElement
      bind:isHovering
      class="flex flex-col items-start w-full h-full justify-between"
    >
      <div class="flex gap-2 items-center">
        <div class="flex flex-col items-start">
          <div class="text-left text-b2 truncate w-40 md:w-40">
            {goal.label ?? ""}
          </div>
        </div>
      </div>
      {#if isActive && $sessionStore.currentTask}
        <div class="flex w-full justify-between text-h4">
          <!-- <div class="flex items-center gap-1 text-b5">
          <div>
            {formatTime($sessionStore.start ?? new Date())}
          </div>
        </div> -->
          <div class="leading-none font-medium">
            {formatSeconds(focusTime, TimeFormat.CLOCK)}
          </div>
        </div>
      {:else}
        <div class="text-b4 text-fgs2">
          {isFinishingState
            ? "Finishing session..."
            : isHovering && !isInEditMode
              ? "Click to start"
              : todayFocusDuration
                ? formatSeconds(todayFocusDuration) + " today"
                : "Not focused today"}
        </div>
      {/if}
    </HoverableElement>
    {#if isInEditMode}
      <UnpinAction on:click={unPin} />
    {/if}
  </CustomColorPropagator>
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
