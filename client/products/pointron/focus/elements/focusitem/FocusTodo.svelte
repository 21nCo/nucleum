<script lang="ts">
  import {
    focusItemsStore,
    activeSession
  } from "$lib/client/products/pointron/focus/session.store";
  import type {
    IFocusTodo,
    IActiveSessionStore,
    ISessionInterval
  } from "$lib/client/types/pointron/session.type";
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
  import Button from "$lib/client/elements/button/Button.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import Check from "$lib/client/icons/Check.svelte";
  import view from "$lib/client/stores/view.store";
  import { Size } from "$lib/client/types/size.enum";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { renderPopover } from "$lib/client/utils/browser.utils";
  import { onMount } from "svelte";
  import DurationInput from "$lib/client/elements/input/durationInput/DurationInput.svelte";
  import { Placement, Orientation } from "$lib/client/types/direction.enum";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import { InputStyle } from "$lib/client/types/input.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import { SessionType } from "../../../logs/log.type";
  import { resolveTaskFocus } from "../../session.utils";
  import { isSameResource } from "$lib/client/components/flux/resourceStores/resource.utils";

  export let todo: IFocusTodo;
  export let isInEditMode: boolean = false;
  export let intervals: ISessionInterval[] = [];
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
  $: workedTime =
    context === "history" && todo.worked
      ? todo.worked
      : resolveTaskFocus(
          context === "history" ? intervals : $activeSession.intervals,
          todo.blocks,
          isInprogress && $activeSession.currentFocusItem
            ? $activeSession.currentFocusItem.start
            : undefined
        );
  // $: console.log({
  //   workedTime,
  //   task,
  //   isInprogress,
  //   currentTask: $sessionStore.currentTask
  // });
  onMount(() => {
    estimatePopupRef.style.display = "none";
    label = todo.label;
    // workedTime = +task.worked;
    // estimateInMinutes = task.estimated;
    if (context === "history") return;
    const sub = activeSession.subscribe((x: IActiveSessionStore) => {
      if (x.currentFocusItem && isSameResource(x.currentFocusItem, todo)) {
        isInprogress = true;
      } else {
        isInprogress = false;
      }
    });
    return () => sub();
  });

  $: if (isInprogress && scrollToTask)
    scrollToTask.scrollIntoView({ behavior: "smooth", block: "center" });

  async function save() {
    todo.label = label;
    await focusItemsStore.updateTodoLabel(todo.id, label);
  }

  async function onCheckClicked(event: MouseEvent) {
    if (context === "history") return;
    todo.checked = !todo.checked;
    focusItemsStore.updateTodo(todo.id, {
      checked: todo.checked
    });
    if (isInprogress) {
      isInprogress = false;
      await activeSession.stopCurrentFocusItem();
    }
    event.stopPropagation();
  }

  function onEstimateClicked(event: MouseEvent) {
    renderPopover({
      triggerRef: estimateButtonRef,
      popRef: estimatePopupRef,
      placement: $view.isPortrait ? Placement.BottomRight : Placement.Left
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
      ($activeSession.isSessionRunning &&
        $activeSession.type === SessionType.PREDEFINED_INTERVALS &&
        $activeSession.state === SessionState.BREAK_RUNNING)
    )
      return;
    if ($activeSession.isSessionRunning) {
      if (isInprogress) {
        await activeSession.stopCurrentFocusItem();
      } else {
        if (todo.checked) todo.checked = false;
        await activeSession.startTask(todo.id);
      }
    } else {
      labelInputElement.focus();
    }
  }

  function onEstimationFocus(event: any) {
    event.stopPropagation();
  }

  async function onDeleteClicked() {
    await focusItemsStore.removeTodo(todo.id);
  }
</script>

<div
  draggable={isDragEnabled &&
    ((context === "current" && !$activeSession.isSessionRunning) ||
      isInEditMode)}
  class="flex gap-2 items-center w-full"
>
  <button
    class={cn(
      "w-full flex gap-2 items-center justify-between px-4 h-12 rounded-md ",
      {
        "bg-ccs1 border-ccs1": isInprogress
      }
    )}
    on:click={clickHandler}
  >
    <div
      class="flex gap-2 flex-grow justify-start items-center truncate {todo.checked &&
        'line-through'}"
    >
      <Check
        isChecked={todo.checked}
        on:click={onCheckClicked}
        isAccentBgActive={isInprogress}
        size={Size.sm}
      />
      {#if isInEditMode || (context === "current" && !$activeSession.isSessionRunning)}
        <TextInput
          on:keyup={handleKeyUp}
          on:focus
          on:blur
          bind:this={labelInputElement}
          bind:value={label}
          placeholder="Add a todo"
          style={InputStyle.PLAIN}
          size={Size.md}
        />
      {:else}
        <div class="text-b2" bind:this={scrollToTask}>{todo.label}</div>
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
          class={todo.estimated == 0 || !todo.estimated || isInprogress
            ? ""
            : workedTime >= todo.estimated
              ? "text-ars1"
              : "text-ags1"}
        >
          {formatSeconds(workedTime)}
        </div>
        {todo.estimated && todo.estimated != 0
          ? "/ " + formatSeconds(todo.estimated)
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
              bind:value={todo.estimated}
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
  </button>
  {#if isInEditMode || (context === "current" && !$activeSession.isSessionRunning)}
    <Button icon="cross" on:click={onDeleteClicked} tooltip="Remove" />
  {/if}
  <span
    class="text-xl text-gray-300 {isPortraitDragEnabled ? '' : 'hidden'}"
    on:touchstart={() => (isDragEnabled = true)}
    on:touchend={() => (isDragEnabled = false)}>⇳</span
  >
</div>
