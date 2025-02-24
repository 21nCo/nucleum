<script lang="ts">
  import view from "$lib/client/stores/view.store";
  import {
    focusItemsStore,
    activeSession
  } from "$lib/client/products/pointron/focus/session.store";
  import { onMount } from "svelte";
  import FocusTodo from "./FocusTodo.svelte";
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
    IFocusTask,
    ISessionInterval
  } from "$lib/client/types/pointron/session.type";
  import { resolveTaskFocus } from "../../session.utils";
  import type { ITaskThumb } from "$lib/client/components/tasks/task.type";
  import { isSameResource } from "$lib/client/components/flux/resourceStores/resource.utils";

  export let task: ITaskThumb;
  export let focusItem: IFocusTask;
  export let todos: any[] = [];
  export let isFocusAddTask: boolean = false;
  export let isInEditMode: boolean = false;
  export let contxt: "current" | "history" = "current";
  export let intervals: ISessionInterval[] = [];

  let parentHierarchy: string[] = [];
  let isInprogress: boolean = false;
  let addTaskInputRef: any;
  // let workedTime: number = 0;
  let isDragEnabled: boolean;
  $: isDragEnabled = $view.isPortrait ? false : true;
  $: isInprogress =
    ($activeSession.currentFocusItem &&
      isSameResource(focusItem, $activeSession.currentFocusItem)) ??
    false;

  $: parentHierarchy = task?.parent?.map((x: any) => x.label) ?? [];

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
    )
      return;
    if ($activeSession.isSessionRunning) {
      if (isInprogress) {
        await activeSession.stopCurrentFocusItem();
      } else {
        await activeSession.startTask(focusItem.id);
      }
    }
  }
  async function onDeleteClicked() {
    await focusItemsStore.removeTask(focusItem.id);
  }
  // $: console.log({ item, intervals, isInprogress, tasks });
</script>

<div
  draggable={isDragEnabled &&
    contxt === "current" &&
    (!$activeSession.isSessionRunning || isInEditMode)}
  class="flex flex-col gap-4 w-full"
>
  {#if (focusItem.id && (!$activeSession.isSessionRunning || isInEditMode) && contxt === "current") || (focusItem.id && todos.length > 0)}
    <CustomColorPropagator
      color={task.color}
      class="relative flex items-center gap-2 w-full"
    >
      <div
        class="flex flex-col gap-2 w-full pb-2 border-2 border-bgs2 rounded-md"
      >
        <div
          class={cn("text-left px-3 pt-3 font-medium truncate min-w-0 flex-1", {
            "text-ccs1": task.color,
            "text-fgs2": !task.color
          })}
        >
          <div>
            <BreadcrumbMini
              hierarchy={parentHierarchy}
              slice={3}
              truncateLength={15}
            />
          </div>
          {task.label}
        </div>
        <div class="px-2">
          {#if todos && todos.length > 0}
            {#each todos as task, index (task)}
              <FocusTodo
                todo={task}
                {intervals}
                {isInEditMode}
                context={contxt}
              />
              {#if index < todos.length - 1}
                <div class="mx-1 border-b border-bgs2" />
              {/if}
            {/each}
          {/if}
          {#if (contxt === "current" && !$activeSession.isSessionRunning) || isInEditMode}
            <div class="mx-1 border-b border-bgs2" />
            <AddTodo
              taskId={focusItem.id}
              placeholder="Add todo"
              bind:this={addTaskInputRef}
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
            on:click={onDeleteClicked}
          />
        </div>
      {/if}
    </CustomColorPropagator>
  {:else if focusItem.id}
    <CustomColorPropagator
      class={cn(
        "flex  gap-4 items-center border-2 border-bgs2 w-full p-3 rounded-md",
        {
          "bg-ccs1 border-ccs1": isInprogress,
          "text-ccs1": !isInprogress
        }
      )}
      color={task.color}
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
        {task.label}
      </div>
      {#if isInprogress && contxt == "current" && $activeSession.currentFocusItem}
        <div class="leading-none text-b3">
          <!-- TODO - test if worked time is correct -->
          {formatSeconds(
            resolveTaskFocus(
              $activeSession.intervals,
              focusItem.blocks,
              $activeSession.currentFocusItem.start
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
  {/if}
</div>
