<script lang="ts">
  import view from "$lib/client/stores/view.store";
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
    resourceInList
  } from "$lib/client/components/flux/resourceStores/resource.utils";
  import FocusTask from "./FocusTask.svelte";
  import type { ITaskThumb } from "$lib/client/components/tasks/task.type";
  import { appStore } from "$lib/client/stores/app.store";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import { resolveGoalColor } from "$lib/client/components/goals/goal.utils";
  import { createEventDispatcher } from "svelte";
  import { toasts } from "$lib/client/stores/notification.store";
  const dispatch = createEventDispatcher();

  export let focusItem: IFocusItem;
  export let tasks: ITaskThumb[] = [];
  export let goals: IGoalThumb[] = [];
  export let isFocusAddTask: boolean = false;
  export let isInEditMode: boolean = false;
  export let contxt: "current" | "history" = "current";
  export let intervals: ISessionInterval[] = [];
  $: goal = goals.find(resourceInList(focusItem.id));
  $: color = resolveGoalColor(goal);
  $: tasksUnderGoal = resolveTaskFocusItems(focusItem);

  let parentHierarchy: string[] = [];
  let isInprogress: boolean = false;
  let addTaskInputRef: any;
  // let workedTime: number = 0;
  let isDragEnabled: boolean;
  $: isDragEnabled = $view.isPortrait ? false : true;
  $: isInprogress =
    ($currentFocusItem && isSameResource(focusItem, $currentFocusItem)) ??
    false;

  $: parentHierarchy = goal?.parent?.map((x: any) => x.label) ?? [];

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
        return;
      }
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
    return $focusItemsStore.items.filter((x) =>
      focusItem.tasks?.some(resourceInList(x.id))
    );
  }
</script>

<div
  draggable={isDragEnabled &&
    contxt === "current" &&
    (!$activeSession.isSessionRunning || isInEditMode)}
  class="flex flex-col gap-4 w-full userdata"
>
  {#if (goal && (!$activeSession.isSessionRunning || isInEditMode) && contxt === "current") || (goal && tasksUnderGoal.length > 0)}
    <CustomColorPropagator
      {color}
      class="relative flex items-center gap-2 w-full"
    >
      <div
        class="flex flex-col gap-2 w-full pb-2 border border-brs3 rounded-md"
      >
        <div
          class={cn("text-left px-3 pt-3 font-medium truncate min-w-0 flex-1", {
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
            {#each tasksUnderGoal as taskFocusItem, index (taskFocusItem)}
              {@const task = tasks.find(resourceInList(taskFocusItem.id))}
              {#if task}
                <FocusTask
                  focusItem={taskFocusItem}
                  {task}
                  {intervals}
                  {isInEditMode}
                  context={contxt}
                  on:remove
                />
              {/if}
              {#if index < tasksUnderGoal.length - 1}
                <div class="mx-1 border-b border-bgs2" />
              {/if}
            {/each}
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
            label="Remove"
            on:click={onRemoveClicked}
          />
        </div>
      {/if}
    </CustomColorPropagator>
  {:else if goal}
    <CustomColorPropagator
      class={cn(
        "flex  gap-4 items-center border border-brs3 w-full p-3 rounded-md",
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
