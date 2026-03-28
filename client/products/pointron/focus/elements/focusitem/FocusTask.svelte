<script lang="ts">
  import {
    focusItemsStore,
    activeSession,
    currentFocusItem
  } from "@21n/products/pointron/focus/session.store";
  import type {
    ISessionInterval,
    IFocusItem,
    ICurrentFocusItem
  } from "@21n/types/pointron/session.type";
  import { SessionState } from "@21n/types/pointron/sessionState.enum";
  import Button from "@21n/elements/button/Button.svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import view from "@21n/stores/view.store";
  import { Size } from "@21n/types/size.enum";
  import { formatSeconds } from "@21n/utils/time.utils";
  import { onMount } from "svelte";
  import { InputStyle } from "@21n/types/input.type";
  import { cn } from "@21n/utils/ui.utils";
  import { SessionType } from "@21n/products/pointron/logs/log.type";
  import { resolveTaskFocus } from "@21n/products/pointron/focus/session.utils";
  import { isSameResource } from "@21n/components/flux/resourceStores/resource.utils";
  import type { ITaskThumb } from "@21n/components/tasks/task.type";
  import { taskStore } from "@21n/components/tasks/task.store";
  import TaskCheckbox from "@21n/components/tasks/TaskCheckbox.svelte";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import { popover } from "@21n/actions/popover.action";
  import FocusTaskEstimatedTimePopover from "@21n/products/pointron/focus/elements/focusitem/FocusTaskEstimatedTimePopover.svelte";
  import type { TimeUnit } from "@21n/types/time.type";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let task: ITaskThumb;
  export let focusItem: IFocusItem;
  export let isInEditMode: boolean = false;
  export let intervals: ISessionInterval[] = [];
  export let context: "current" | "history" = "current";
  export let isStandalone: boolean = false;
  let workedTime: number = 0;
  let isInprogress: boolean = false;
  let labelInputElement: any;
  let labelEntry: string;
  let scrollToTask: any = null;
  function resolveWorkedTime() {
    if (
      context === "history" &&
      "worked" in focusItem &&
      typeof focusItem.worked === "number"
    ) {
      return focusItem.worked;
    }
    return resolveTaskFocus(
      context === "history" ? intervals : $activeSession.intervals,
      focusItem.blocks,
      isInprogress && $currentFocusItem ? $currentFocusItem.start : undefined
    );
  }
  $: workedTime = resolveWorkedTime();
  // $: console.log({
  //   workedTime,
  //   task,
  //   isInprogress,
  //   currentTask: $sessionStore.currentTask
  // });
  onMount(() => {
    labelEntry = task.label ?? "";
    // workedTime = +task.worked;
    // estimateInMinutes = task.estimated;
    if (context === "history") return;
    const sub = currentFocusItem.subscribe(
      (x: ICurrentFocusItem | undefined) => {
        if (x && isSameResource(x, focusItem)) {
          isInprogress = true;
        } else {
          isInprogress = false;
        }
      }
    );
    return () => sub();
  });

  $: if (isInprogress && scrollToTask)
    scrollToTask.scrollIntoView({ behavior: "smooth", block: "center" });

  async function onLabelChange() {
    task.label = labelEntry;
    await taskStore.modify(task.id, { label: labelEntry });
  }

  async function onCheckClicked(event: CustomEvent<any>) {
    if (context === "history") return;
    if (isInprogress) {
      isInprogress = false;
      await activeSession.stopCurrentFocusItem();
    }
  }

  async function clickHandler() {
    if (
      isInEditMode ||
      context === "history" ||
      ($activeSession.isSessionRunning &&
        $activeSession.type === SessionType.PREDEFINED_INTERVALS &&
        $activeSession.state === SessionState.BREAK_RUNNING)
    )
      return;
    if ($activeSession.isSessionRunning) {
      if (isInprogress) {
        await activeSession.stopCurrentFocusItem();
      } else {
        if (task.isChecked) task.isChecked = false;
        await activeSession.startTask(focusItem.id);
      }
    } else {
      labelInputElement.focus();
    }
  }

  async function onRemove() {
    dispatch("remove", focusItem.id);
  }

  function onEstimatedTimeChange(
    e: CustomEvent<{ value: number; unit: TimeUnit }>
  ) {
    if (!e.detail?.value) return;
    const value = e.detail.value;
    task.estimated = value;
    taskStore.modify(task.id, {
      estimated: value
    });
  }
</script>

<div
  class={cn("flex gap-2 items-center w-full", {
    "border border-brs3 rounded-md": isStandalone
  })}
>
  <button
    class={cn(
      "relative w-full flex gap-2 items-center justify-between px-4 h-12 rounded-md ",
      {
        "bg-ccs1 border-ccs1": isInprogress,
        "pl-8": isInEditMode
      }
    )}
    on:click={clickHandler}
  >
    {#if isInEditMode}
      <span class="absolute left-2 top-3.5">
        <Icon
          icon="rearrange"
          class={cn({
            "text-cbg": isInprogress,
            "text-fgs2": !isInprogress
          })}
        />
      </span>
    {/if}
    <div
      class="flex gap-2 flex-grow justify-start items-center truncate {task.isChecked &&
        'line-through'}"
    >
      <TaskCheckbox
        id={task.id}
        bind:isChecked={task.isChecked}
        accessPoint={ResourceAccessPoint.FOCUS}
        on:toggle={onCheckClicked}
        isAccentBg={isInprogress}
      />
      {#if isInEditMode || (context === "current" && !$activeSession.isSessionRunning)}
        <TextInput
          on:focus
          on:blur
          on:debouncedChange={onLabelChange}
          bind:this={labelInputElement}
          bind:value={labelEntry}
          placeholder="Enter task label"
          style={InputStyle.PLAIN}
          size={Size.md}
          isAccentBackground={isInprogress}
        />
      {:else}
        <div class="text-b2" bind:this={scrollToTask}>{task.label}</div>
      {/if}
    </div>
    <div class="min-w-fit flex justify-center items-center">
      <button
        class="flex items-center gap-1 text-b3"
        on:click|stopPropagation
        use:popover={{
          content: FocusTaskEstimatedTimePopover,
          isRenderAsModalForCW: true,
          componentProps: {
            estimatedTime: task.estimated,
            onChange: onEstimatedTimeChange
          }
        }}
      >
        <Icon
          icon="ph:clock-countdown-light"
          size={Size.sm}
          class={cn({
            "fill-cbg": isInprogress
          })}
        />
        <div
          class={task.estimated == 0 || !task.estimated || isInprogress
            ? ""
            : workedTime >= task.estimated
              ? "text-ars1"
              : "text-ags1"}
        >
          {formatSeconds(workedTime)}
        </div>
        {task.estimated && task.estimated != 0
          ? "/ " + formatSeconds(task.estimated)
          : ""}
      </button>
    </div>
  </button>
  {#if isInEditMode || (context === "current" && !$activeSession.isSessionRunning)}
    <Button icon="cross" on:click={onRemove} tooltip="Remove" />
  {/if}
</div>
