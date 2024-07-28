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
  import { SessionType } from "../../../logs/log.type";
  import type { IFocusGoal } from "$lib/client/types/pointron/session.type";
  import { goalStore } from "../../../goals/goal.store";
  import { resolveTaskFocus } from "../../session.utils";
  export let item: IFocusGoal;
  export let isFocusAddTask: boolean = false;
  export let isInEditMode: boolean = false;
  export let contxt: "current" | "history" = "current";
  let isInprogress: boolean = false;
  let addTaskInputRef: any;
  // let workedTime: number = 0;
  let isDragEnabled: boolean;
  $: isPortraitDragEnabled = $view.isPortrait && isInEditMode ? true : false;
  $: isDragEnabled = $view.isPortrait ? false : true;
  $: isInprogress = $sessionStore.currentTask?.id === item.id;
  $: console.log({ isInprogress, item, goal });
  $: tasks =
    $focusItemsStore.tasks?.filter((x) => item.tasks?.includes(x.id)) ?? [];
  $: goal = goalStore.resolveGoal(item.id);
  //TODO - test parentHierarchy
  $: parentHierarchy = goal?.parent?.hierarchy?.map((x: any) => x.label);
  // $: console.log({ item, tasks, goal, parentHierarchy });
  onMount(() => {
    if (item.id && contxt == "current") {
      if (
        isFocusAddTask &&
        addTaskInputRef &&
        $context.embed != Embed.HANDSET
      ) {
        addTaskInputRef.focus();
      }
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
      x.dropItem.id == item.id &&
      x.dropItem.id == x.dragItem.id &&
      $dragAndDropStore.dragStatus == DragStatus.DROPPED
    ) {
      let modifiedItems = handleDragNDrop(x, tasks);
      if (modifiedItems) {
        await focusItemsStore.updateOrderValueForTasks(item.id, modifiedItems);
        item.tasks = modifiedItems;
        item = item;
        dragAndDropStore.reset();
      }
    }
  });
  onDestroy(unSubscribeDND);

  async function clickHandler() {
    if (
      isInEditMode ||
      contxt === "history" ||
      ($sessionStore.isSessionRunning &&
        $sessionStore.type === SessionType.PREDEFINED_INTERVALS &&
        $sessionStore.state === SessionState.BREAK_RUNNING)
    )
      return;
    if ($sessionStore.isSessionRunning) {
      if (isInprogress) {
        await sessionStore.stopCurrentTaskOrGoal();
      } else {
        await sessionStore.startGoal(item.id);
      }
    }
  }
  async function onDeleteClicked() {
    await focusItemsStore.removeGoal(item.id);
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
  {#if (item.id && (!$sessionStore.isSessionRunning || isInEditMode)) || (item.id && tasks.length > 0)}
    <CustomColorPropagator
      color={goal.color}
      class="relative flex items-center gap-2 w-full"
    >
      <div
        class="flex flex-col gap-2 w-full pb-2 border-2 border-bgs2 rounded-md"
      >
        <div
          class={cn("text-left px-3 pt-3 font-medium truncate w-4/5", {
            "text-ccs1": goal.color,
            "text-fgs2": !goal.color
          })}
        >
          <div>
            <BreadcrumbMini
              hierarchy={parentHierarchy}
              slice={3}
              truncateLength={15}
            />
          </div>
          {goal.label}
          <!-- TODO - drag the entire focus item for rearranging -->
          <!-- <span
            class="text-xl {isPortraitDragEnabled ? '' : 'hidden'}"
            on:touchstart={() => (isDragEnabled = true)}
            on:touchend={() => (isDragEnabled = false)}>&nbsp&nbsp⇳</span
          > -->
        </div>
        <div class="px-2">
          {#if tasks && tasks.length > 0}
            {#each tasks as task, index (task)}
              <Task {task} {isInEditMode} context={contxt} />
              {#if index < tasks.length - 1}
                <div class="mx-1 border-b border-bgs2" />
              {/if}
            {/each}
          {/if}
          {#if (contxt === "current" && !$sessionStore.isSessionRunning) || isInEditMode}
            <div class="mx-1 border-b border-bgs2" />
            <AddTask
              goalId={item.id}
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
    </CustomColorPropagator>
  {:else if $sessionStore.isSessionRunning && item.id}
    <CustomColorPropagator
      class={cn(
        "flex justify-between items-center border-2 border-bgs2 w-full p-3 rounded-md",
        {
          "bg-ccs1 border-ccs1": isInprogress,
          "text-ccs1": !isInprogress
        }
      )}
      color={goal.color}
      on:click={clickHandler}
    >
      <div class="text-left truncate w-4/5">
        <div>
          <BreadcrumbMini
            hierarchy={parentHierarchy}
            slice={3}
            truncateLength={15}
          />
        </div>
        {goal.label}
      </div>
      {#if isInprogress && contxt == "current" && $sessionStore.currentTask}
        <div class="leading-none text-b3">
          <!-- TODO - test if worked time is correct -->
          {formatSeconds(
            resolveTaskFocus(
              $sessionStore.intervals,
              item.blocks,
              $sessionStore.currentTask.start
            )
          )}
        </div>
      {:else}
        <div class="text-fgs3 text-b3">
          {formatSeconds(
            resolveTaskFocus($sessionStore.intervals, item.blocks)
          )}
        </div>
      {/if}
    </CustomColorPropagator>
  {/if}
</DraggableElement>
