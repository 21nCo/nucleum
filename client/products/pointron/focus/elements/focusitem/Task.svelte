<script lang="ts">
  import {
    focusItemsStore,
    sessionStore
  } from "$lib/client/products/pointron/focus/session.store";
  import type {
    FocusItem,
    ISessionStore
  } from "$lib/client/types/pointron/session.type";
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
  import { calculateTotalFocusAndBreak } from "$lib/client/products/pointron/pointron.utils";
  import Button from "$lib/client/elements/button/Button.svelte";
  import DraggableElement from "$lib/client/elements/DraggableElement.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import Check from "$lib/client/icons/Check.svelte";
  import view from "$lib/client/stores/view.store";
  import { Size } from "$lib/client/types/size.enum";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { renderPopover } from "$lib/client/utils/browser.utils";
  import { onMount } from "svelte";
  import DurationInput from "$lib/client/elements/input/durationInput/DurationInput.svelte";
  import { Position, Orientation } from "$lib/client/types/direction.enum";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import { InputStyle } from "$lib/client/types/input.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  import { SessionType } from "../../../logs/log.type";
  export let task: FocusItem & Required<Pick<FocusItem, "taskId">>;
  export let isInEditMode: boolean = false;
  export let context: "current" | "history" = "current";
  let workedTime: number = 0;
  let estimateInMinutes: number = 0;
  let isInprogress: boolean = false;
  let labelInputElement: any;
  let label: string;
  let estimateButtonRef: any;
  let estimatePopupRef: any;
  let isDragEnabled: boolean;
  $: isPortraitDragEnabled = $view.isPortrait && isInEditMode ? true : false;
  $: isDragEnabled = $view.isPortrait ? false : true;
  let scrollToTask: any = null;
  onMount(() => {
    estimatePopupRef.style.display = "none";
    label = task.label;
    workedTime = +task.worked;
    estimateInMinutes = task.estimated;
    if (context === "history") return;
    const sub = sessionStore.subscribe((x: ISessionStore) => {
      if (x.currentLog?.taskId === task.taskId) {
        isInprogress = true;
        if (x.state == SessionState.FOCUS_RUNNING) {
          let duration = calculateTotalFocusAndBreak(x.currentLog.blocks, true);
          workedTime = (+task.worked ?? 0) + duration.focus ?? task.worked;
        }
      } else {
        isInprogress = false;
      }
    });
    return () => sub();
  });

  $: if (isInprogress && scrollToTask)
    scrollToTask.scrollIntoView({ behavior: "smooth", block: "center" });

  async function save() {
    task.label = label;
    await focusItemsStore.updateTask(task, true);
  }
  function onCheckClicked(event: MouseEvent) {
    if (context === "history") return;
    task.checked = !task.checked;
    focusItemsStore.updateTaskStatus(task.taskId, task.checked);
    if (isInprogress) {
      isInprogress = false;
      sessionStore.stopCurrentTaskOrGoal();
    }
    event.stopPropagation();
  }
  function onEstimateClicked(event: MouseEvent) {
    renderPopover({
      triggerRef: estimateButtonRef,
      popRef: estimatePopupRef,
      placement: $view.isPortrait ? Position.BottomRight : Position.Left
    });
  }
  function hideEstimatePopup() {
    estimatePopupRef.style.display = "none";
  }
  function handleKeyUp(event: any) {
    if (event.key === "Enter") {
      labelInputElement.blur();
      save();
    }
    save();
    event.stopPropagation();
  }
  async function clickHandler() {
    if (
      isInEditMode ||
      context === "history" ||
      ($sessionStore.isSessionRunning &&
        $sessionStore.type === SessionType.PREDEFINED_INTERVALS &&
        $sessionStore.state === SessionState.BREAK_RUNNING)
    )
      return;
    if ($sessionStore.isSessionRunning) {
      if (isInprogress) {
        sessionStore.stopCurrentTaskOrGoal();
      } else {
        if (task.checked) task.checked = false;
        await sessionStore.startTask(
          task.taskId,
          task.label,
          task.color,
          task.goalId
        );
      }
    } else {
      labelInputElement.focus();
    }
  }
  function onEstimationFocus(event: any) {
    event.stopPropagation();
  }
  async function onDeleteClicked() {
    await focusItemsStore.deleteTask(task.taskId);
  }
</script>

<DraggableElement
  item={task}
  isDraggable={isDragEnabled &&
    ((context === "current" && !$sessionStore.isSessionRunning) ||
      isInEditMode)}
  id={task.goalId ?? "soloTaskItem"}
  classList="flex gap-2 items-center w-full"
>
  <CustomColorPropagator
    class={cn(
      "w-full flex gap-2 items-center justify-between px-4 rounded-md ",
      {
        "h-12": task.goalId,
        "h-14 border-2 border-brs1": !task.goalId,
        "bg-ccs1 border-ccs1": isInprogress
      }
    )}
    on:click={clickHandler}
    color={task.color}
  >
    <div
      class="flex gap-2 flex-grow justify-start items-center truncate {task.checked &&
        'line-through'}"
    >
      <Check
        isChecked={task.checked}
        on:click={onCheckClicked}
        isAccentBgActive={isInprogress}
      />
      {#if isInEditMode || (context === "current" && !$sessionStore.isSessionRunning)}
        <TextInput
          on:keyup={handleKeyUp}
          on:keydown
          on:focus
          on:blur
          bind:this={labelInputElement}
          bind:value={label}
          placeholder="Add a task"
          style={InputStyle.PLAIN}
          size={Size.md}
        />
      {:else}
        <div class="text-b2" bind:this={scrollToTask}>{task.label}</div>
      {/if}
    </div>
    <div class="min-w-fit flex justify-center items-center">
      <button
        class="flex items-center gap-1 text-b3"
        on:click|stopPropagation={onEstimateClicked}
        bind:this={estimateButtonRef}
      >
        <!-- <Estimate /> -->
        <Icon
          icon="clock"
          size={Size.sm}
          class={cn({
            "fill-cbg": isInprogress
          })}
        />
        <div
          class={task.estimated == 0 || isInprogress
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

      <button
        class="w-60 lg:w-96 z-50 text-fgs1"
        on:click={onEstimationFocus}
        bind:this={estimatePopupRef}
      >
        <div
          class="flex flex-col w-full gap-2 items-center bg-bgs1 border border-brs3 rounded-xl p-4 shadow-md"
        >
          <div class="w-full h-full">
            <DurationInput
              bind:value={task.estimated}
              label={{
                label: "Estimated time",
                orientation: Orientation.Vertical
              }}
            />
          </div>
          <Button
            size={Size.sm}
            style={ButtonStyle.OUTLINED}
            label="done"
            on:click={() => {
              save();
              hideEstimatePopup();
            }}
          />
        </div>
      </button>
    </div>
  </CustomColorPropagator>
  {#if isInEditMode || (context === "current" && !$sessionStore.isSessionRunning)}
    <Button
      icon={task.goalId ? "cross" : "trash"}
      on:click={onDeleteClicked}
      tooltip="Remove"
    />
  {/if}
  <span
    class="text-xl text-gray-300 {isPortraitDragEnabled ? '' : 'hidden'}"
    on:touchstart={() => (isDragEnabled = true)}
    on:touchend={() => (isDragEnabled = false)}>⇳</span
  >
</DraggableElement>
