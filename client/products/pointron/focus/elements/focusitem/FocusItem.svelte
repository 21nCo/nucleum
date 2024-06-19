<script lang="ts">
  import { dragAndDropStore } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import { DragStatus } from "$lib/client/types/dragstatus.enum";
  import { handleDragNDrop } from "$lib/client/utils/dragDrop";
  import {
    focusItemsStore,
    sessionStore
  } from "$lib/client/products/pointron/focus/session.store";
  import { onDestroy, onMount } from "svelte";
  import Task from "./Task.svelte";
  import AddTask from "./AddTask.svelte";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import DraggableElement from "$lib/client/elements/DraggableElement.svelte";
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
  import { calculateTotalFocusAndBreak } from "$lib/client/products/pointron/pointron.utils";
  import { Size } from "$lib/client/types/size.enum";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { Embed } from "$lib/client/types/context.type";
  import context from "$lib/client/stores/context.store";
  import BreadcrumbMini from "$lib/client/elements/breadcrumb/BreadcrumbMini.svelte";
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  export let item: any;
  export let isFocusAddTask: boolean = false;
  export let isInEditMode: boolean = false;
  export let contxt: "current" | "history" = "current";
  let isInprogress: boolean = false;
  let addTaskInputRef: any;
  let workedTime: number = 0;
  let isDragEnabled: boolean;
  $: isPortraitDragEnabled = $view.isPortrait && isInEditMode ? true : false;
  $: isDragEnabled = $view.isPortrait ? false : true;
  onMount(() => {
    workedTime = +item.worked;
    let sessionStoreSub: any;
    if (item.goalId && contxt == "current") {
      sessionStoreSub = sessionStore.subscribe((x: any) => {
        if (x.currentLog?.goalId === item.goalId) {
          isInprogress = true;
          if (x.state == SessionState.FOCUS_RUNNING) {
            let duration = calculateTotalFocusAndBreak(
              x.currentLog.blocks,
              true
            );
            workedTime = (+item.worked ?? 0) + duration.focus ?? item.worked;
          }
        } else {
          isInprogress = false;
        }
      });
      if (
        isFocusAddTask &&
        addTaskInputRef &&
        $context.embed != Embed.HANDSET
      ) {
        addTaskInputRef.focus();
      }
      return () => {
        if (sessionStoreSub) sessionStoreSub();
      };
    }
  });
  const unSubscribeDND = dragAndDropStore.subscribe(async (x: any) => {
    if (
      x.dragId == "goalItem" ||
      x.dragId == "soloTaskItem" ||
      x.dropId == "goalItem" ||
      x.dropId == "soloTaskItem"
    ) {
      console.log(
        "This subscribe is not for goals or soloTaskItem  so returning"
      );
      return;
    } else if (
      x.dropItem.goalId == item.goalId &&
      x.dropItem.goalId == x.dragItem.goalId &&
      $dragAndDropStore.dragStatus == DragStatus.DROPPED
    ) {
      let modifiedItems = handleDragNDrop(x, item.tasks);
      if (modifiedItems) {
        await focusItemsStore.updateOrderValueForTasks(
          item.goalId,
          modifiedItems
        );
        item.tasks = modifiedItems;
        item = item;
        dragAndDropStore.reset();
      }
    }
  });
  onDestroy(unSubscribeDND);

  async function clickHandler() {
    if (contxt != "current") return;
    if ($sessionStore.isSessionRunning) {
      if (isInprogress) {
        await sessionStore.stopCurrentTaskOrGoal();
      } else {
        await sessionStore.startGoal(item.goalId!, item.label, item.color);
      }
    }
  }
  async function onDeleteClicked() {
    await focusItemsStore.deleteGoal(item.goalId);
  }
</script>

<DraggableElement
  isDraggable={isDragEnabled &&
    contxt === "current" &&
    (!$sessionStore.isSessionRunning || isInEditMode)}
  {item}
  id="goalItem"
  classList="flex flex-col gap-4 w-full"
>
  {#if (item.goalId && (!$sessionStore.isSessionRunning || isInEditMode)) || (item.goalId && item.tasks)}
    <div class="relative flex items-center gap-2 w-full">
      <div class="flex flex-col w-full pb-2 border-2 border-bgs2 rounded-md">
        <CustomColorPropagator
          color={item.color}
          class={cn(
            "text-left text-fgs1 py-4 px-4 font-medium truncate w-4/5",
            {
              "text-ccs1": item.color,
              "text-fgs2": item.color
            }
          )}
        >
          <div>
            <BreadcrumbMini
              hierarchy={item.hierarchy}
              slice={3}
              truncateLength={15}
            />
          </div>
          {item.label}
          <!-- TODO - drag the entire focus item for rearranging -->
          <!-- <span
            class="text-xl {isPortraitDragEnabled ? '' : 'hidden'}"
            on:touchstart={() => (isDragEnabled = true)}
            on:touchend={() => (isDragEnabled = false)}>&nbsp&nbsp⇳</span
          > -->
        </CustomColorPropagator>
        <div class="px-4">
          {#if item.tasks && item.tasks.length > 0}
            {#each item.tasks as task, index (task.taskId)}
              <Task {task} {isInEditMode} context={contxt} />
              {#if index < item.tasks.length - 1}
                <div class="border-b border-bgs2" />
              {/if}
            {/each}
          {/if}
          {#if (contxt === "current" && !$sessionStore.isSessionRunning) || isInEditMode}
            <div class="border-b border-bgs2" />
            <AddTask
              goalId={item.goalId}
              placeholder={"add task"}
              bind:this={addTaskInputRef}
            />
          {/if}
        </div>
      </div>
      {#if isInEditMode || (contxt === "current" && !$sessionStore.isSessionRunning)}
        <!-- <Button icon="trash" size={Size.sm} on:click={onDeleteClicked} /> -->
        <div class="absolute bg-bgs1 right-1 -top-3">
          <Button
            icon="minus-circled"
            size={Size.xs}
            type={ButtonVariant.DANGER}
            style={ButtonStyle.OUTLINED}
            label="Remove"
            on:click={onDeleteClicked}
          />
        </div>
      {/if}
    </div>
  {:else if $sessionStore.isSessionRunning && item.goalId}
    <CustomColorPropagator
      class={cn(
        "flex justify-between items-center border-2 border-bgs2 w-full py-4 px-4 rounded-md",
        {
          "bg-ccs1 border-ccs1": isInprogress,
          "text-ccs1": !isInprogress
        }
      )}
      color={item.color}
      on:click={clickHandler}
    >
      <div class="text-left truncate w-4/5">
        <div>
          <BreadcrumbMini
            hierarchy={item.hierarchy}
            slice={3}
            truncateLength={15}
          />
        </div>
        {item.label}
      </div>
      {#if isInprogress}
        <div class="leading-none text-b3">
          {formatSeconds(workedTime)}
        </div>
      {:else}
        <div class="text-fgs3 text-b3">
          {formatSeconds(workedTime)}
        </div>
      {/if}
    </CustomColorPropagator>
  {:else}
    <Task task={item} {isInEditMode} context={contxt} />
  {/if}
</DraggableElement>
