<script lang="ts">
  import {
    focusItemsStore,
    activeSession,
    currentFocusItem
  } from "$lib/client/products/pointron/focus/session.store";
  import { onMount } from "svelte";
  import AddTodo from "./AddTodo.svelte";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
  import { Size } from "$lib/client/types/size.enum";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { Embed } from "$lib/client/types/context.type";
  import context from "$lib/client/stores/context.store";
  import BreadcrumbMini from "$lib/client/elements/breadcrumb/BreadcrumbMini.svelte";
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { SessionType } from "../../../logs/log.type";
  import type {
    IFocusItem,
    ISessionInterval
  } from "$lib/client/types/pointron/session.type";
  import { resolveTaskFocus } from "../../session.utils";
  import type { IGoalThumb } from "$lib/client/components/goals/goal.type";
  import {
    isSameResource,
    resourceInList,
    shiftResourceInArray
  } from "$lib/client/components/flux/resourceStores/resource.utils";
  import FocusTask from "./FocusTask.svelte";
  import type { ITaskThumb } from "$lib/client/components/tasks/task.type";
  import { appStore } from "$lib/client/stores/app.store";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import { resolveGoalColor } from "$lib/client/components/goals/goal.utils";
  import { createEventDispatcher } from "svelte";
  import { toasts } from "$lib/client/stores/notification.store";
  import { reorderList } from "$lib/client/actions/rearrange.action";
  import Icon from "$lib/client/elements/Icon.svelte";
  const dispatch = createEventDispatcher();

  export let focusItem: IFocusItem;
  export let tasks: ITaskThumb[] = [];
  export let goals: IGoalThumb[] = [];
  export let isFocusAddTask: boolean = false;
  export let isInEditMode: boolean = false;
  export let contxt: "current" | "history" = "current";
  /**
   * Needed if the contxt param is "history"
   */
  export let intervals: ISessionInterval[] = [];
  /**
   * Needed if the contxt param is "history"
   */
  export let focusItemsList: IFocusItem[] = [];
  $: goal = goals.find(resourceInList(focusItem.id));
  $: color = resolveGoalColor(goal);
  $: tasksUnderGoal = resolveTaskFocusItems(focusItem);

  let parentHierarchy: string[] = [];
  let isInprogress: boolean = false;
  let addTaskInputRef: any;
  // let workedTime: number = 0;
  $: isInprogress =
    ($currentFocusItem && isSameResource(focusItem, $currentFocusItem)) ??
    false;

  $: parentHierarchy = goal?.parent
    ? goal.parent?.map((x: any) => x.label)
    : [];

  onMount(() => {
    try {
      if (focusItem.id && contxt == "current") {
        if (
          isFocusAddTask &&
          addTaskInputRef &&
          $context.embed != Embed.HANDSET
        ) {
          addTaskInputRef?.focus();
        }
      }
    } catch (e) {
      console.warn("Error in focusItem.svelte", e);
    }
  });

  async function clickHandler() {
    if (
      isInEditMode ||
      contxt === "history" ||
      ($activeSession.isSessionRunning &&
        $activeSession.type === SessionType.PREDEFINED_INTERVALS &&
        $activeSession.state === SessionState.BREAK_RUNNING)
    ) {
      if ($activeSession.state === SessionState.BREAK_RUNNING) {
        toasts.error("Cannot start working on an item while break is running", {
          title: "Break running"
        });
      }
      return;
    }
    if ($activeSession.isSessionRunning) {
      if (isInprogress) {
        await activeSession.stopCurrentFocusItem();
      } else {
        await activeSession.startTask(focusItem.id);
      }
    }
  }
  async function onRemoveClicked() {
    dispatch("remove", focusItem.id);
  }

  function resolveTaskFocusItems(focusItem: IFocusItem) {
    if (contxt === "current") {
      return (
        focusItem.tasks
          ?.map((taskId) => $focusItemsStore.items.find(resourceInList(taskId)))
          .filter(Boolean) ?? []
      );
    } else {
      return (
        focusItem.tasks
          ?.map((taskId) => focusItemsList.find(resourceInList(taskId)))
          .filter(Boolean) ?? []
      );
    }
  }

  function onReorderTasks(event: any) {
    const { fromId, toId } = event;
    if (!goal || !focusItem.tasks) return;
    tasksUnderGoal = shiftResourceInArray(tasksUnderGoal, fromId, toId);
    focusItemsStore.rearrangeTasksInGoal(focusItem.id, fromId, toId);
  }
</script>

<div
  class={cn("flex flex-col gap-4 w-full userdata", {
    "cursor-move": isInEditMode
  })}
>
  {#if (goal && (!$activeSession.isSessionRunning || isInEditMode) && contxt === "current") || (goal && tasksUnderGoal.length > 0)}
    <CustomColorPropagator
      {color}
      class="relative flex items-center gap-2 w-full"
    >
      <div
        class="relative flex flex-col gap-2 w-full pb-2 border border-brs3 rounded-md"
      >
        {#if isInEditMode}
          <span class="absolute left-2 top-3">
            <Icon icon="ph:dots-six-vertical" class="text-fgs2" />
          </span>
        {/if}
        <div
          class={cn("text-left px-3 pt-3 font-medium truncate min-w-0 flex-1", {
            "text-ccs1": color,
            "text-fgs2": !color,
            "pl-8": isInEditMode
          })}
        >
          <div>
            <BreadcrumbMini
              hierarchy={parentHierarchy}
              slice={3}
              truncateLength={15}
            />
          </div>
          <button
            class="notouch:hover:underline active:underline"
            on:click={(e) => {
              e.stopPropagation();
              appStore.openResource(goal.id, ResourceAccessMode.POP);
            }}
          >
            {goal.label}
          </button>
        </div>
        <div class="px-2">
          {#if tasksUnderGoal && tasksUnderGoal.length > 0}
            <div
              use:reorderList={{
                listId: `focus-tasks-${focusItem.id}`,
                draggedOverClass: "outline outline-ass1",
                dragImage: "dragimage",
                onDrop: onReorderTasks
              }}
            >
              {#each tasksUnderGoal as taskFocusItem, index (taskFocusItem.id)}
                {@const task = tasks.find(resourceInList(taskFocusItem.id))}
                {#if task}
                  <div
                    data-index={index}
                    data-id={taskFocusItem.id}
                    draggable={(contxt === "current" &&
                      !$activeSession.isSessionRunning) ||
                      isInEditMode}
                  >
                    <FocusTask
                      focusItem={taskFocusItem}
                      {task}
                      {intervals}
                      {isInEditMode}
                      context={contxt}
                      on:remove
                    />
                  </div>
                {/if}
                {#if index < tasksUnderGoal.length - 1}
                  <div class="mx-1 border-b border-bgs2" />
                {/if}
              {/each}
            </div>
          {/if}
          {#if (contxt === "current" && !$activeSession.isSessionRunning) || isInEditMode}
            <div class="mx-1 border-b border-bgs2" />
            <AddTodo
              goalId={focusItem.id}
              placeholder="Add a task"
              bind:this={addTaskInputRef}
              on:createNew
              on:select
            />
          {/if}
        </div>
      </div>
      {#if isInEditMode || (contxt === "current" && !$activeSession.isSessionRunning)}
        <!-- <Button icon="trash" size={Size.sm} on:click={onDeleteClicked} /> -->
        <div class="absolute bg-bgs1 right-1 -top-3">
          <Button
            icon="minus-circled"
            size={Size.xs}
            type={ButtonVariant.DANGER}
            style={ButtonStyle.OUTLINED}
            isPreventMinWidth={true}
            tooltip="Remove"
            on:click={onRemoveClicked}
          />
        </div>
      {/if}
    </CustomColorPropagator>
  {:else if goal}
    <CustomColorPropagator
      type="button"
      class={cn(
        "flex h-16 gap-4 items-center border border-brs3 w-full p-3 rounded-md",
        {
          "bg-ccs1 border-ccs1": isInprogress,
          "text-ccs1": !isInprogress
        }
      )}
      {color}
      on:click={clickHandler}
    >
      <div class="text-left truncate min-w-0 flex-1">
        <div>
          <BreadcrumbMini
            hierarchy={parentHierarchy}
            slice={3}
            truncateLength={15}
          />
        </div>
        <button
          class="notouch:hover:underline active:underline"
          on:click={(e) => {
            e.stopPropagation();
            appStore.openResource(goal.id, ResourceAccessMode.POP);
          }}
        >
          {goal.label}
        </button>
      </div>
      {#if isInprogress && contxt == "current" && $currentFocusItem}
        <div class="leading-none text-b3">
          <!-- TODO - test if worked time is correct -->
          {formatSeconds(
            resolveTaskFocus(
              $activeSession.intervals,
              focusItem.blocks,
              $currentFocusItem.start
            )
          )}
        </div>
      {:else}
        <div class="text-fgs3 text-b3">
          {formatSeconds(
            contxt === "history" && focusItem.worked
              ? focusItem.worked
              : resolveTaskFocus(
                  contxt == "current" ? $activeSession.intervals : intervals,
                  focusItem.blocks
                )
          )}
        </div>
      {/if}
    </CustomColorPropagator>
  {:else}
    {@const task = tasks.find(resourceInList(focusItem.id))}
    {#if task}
      <FocusTask
        {focusItem}
        {task}
        {intervals}
        {isInEditMode}
        context={contxt}
        isStandalone={true}
        on:remove
      />
    {/if}
  {/if}
</div>
