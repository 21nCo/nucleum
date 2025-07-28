<script lang="ts">
  import {
    focusItemsStore,
    activeSession,
    currentFocusItem
  } from "$lib/client/products/pointron/focus/session.store";
  import type {
    ISessionInterval,
    IFocusItem,
    ICurrentFocusItem
  } from "$lib/client/types/pointron/session.type";
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
  import Button from "$lib/client/elements/button/Button.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import view from "$lib/client/stores/view.store";
  import { Size } from "$lib/client/types/size.enum";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { onMount } from "svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import { SessionType } from "../../../logs/log.type";
  import { resolveTaskFocus } from "../../session.utils";
  import { isSameResource } from "$lib/client/components/flux/resourceStores/resource.utils";
  import type { ITaskThumb } from "$lib/client/components/tasks/task.type";
  import { taskStore } from "$lib/client/components/tasks/task.store";
  import TaskCheckbox from "$lib/client/components/tasks/TaskCheckbox.svelte";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import { popover } from "$lib/client/actions/popover.action";
  import FocusTaskEstimatedTimePopover from "./FocusTaskEstimatedTimePopover.svelte";
  import type { TimeUnit } from "$lib/client/types/time.type";
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
  $: workedTime =
    context === "history" && focusItem.worked
      ? focusItem.worked
      : resolveTaskFocus(
          context === "history" ? intervals : $activeSession.intervals,
          focusItem.blocks,
          isInprogress && $currentFocusItem
            ? $currentFocusItem.start
            : undefined
        );
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
      <span class="absolute left-2 top-3">
        <Icon
          icon="dots-six-vertical"
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
