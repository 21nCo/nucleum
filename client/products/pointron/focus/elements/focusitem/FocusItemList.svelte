<script lang="ts">
  import {
    focusItemsStore,
    lastActiveGoalIdForEditing,
    sessionStore
  } from "$lib/client/products/pointron/focus/session.store";
  import { onDestroy, onMount } from "svelte";
  import FocusItem from "./FocusItem.svelte";
  import AddGoal from "./AddGoal.svelte";
  import { appStore, dragAndDropStore } from "$lib/client/stores/app.store";
  import { handleFocusItemsDND } from "$lib/client/utils/dragDrop";
  import { DragStatus } from "$lib/client/types/dragstatus.enum";
  import { DND } from "$lib/client/utils/DragDropTouch";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import context from "$lib/client/stores/context.store";
  import { Embed } from "$lib/client/types/context.type";
  export let isInEditMode: boolean = false;
  let goalEntry: string = "";
  let isFocusingAddGoal: boolean = false;
  let DragDropTouch: any;
  let ref: any;
  onMount(() => {
    DND(DragDropTouch || (DragDropTouch = {}), ref);
  });
  const unSubscribeDND = dragAndDropStore.subscribe(async (x: any) => {
    if (
      (x.dragId == "goalItem" || x.dragId == "soloTaskItem") &&
      (x.dropId == "goalItem" || x.dropId == "soloTaskItem") &&
      $dragAndDropStore.dragStatus == DragStatus.DROPPED
    ) {
      console.log("This subscribe is for goals & soloTasks so entering");
      let modifiedItems = handleFocusItemsDND(x, $focusItemsStore.goals);
      if (modifiedItems) {
        await focusItemsStore.updateOrderValueForFI(modifiedItems);
        $focusItemsStore.goals = modifiedItems;
        dragAndDropStore.reset();
      }
    }
  });
  onDestroy(unSubscribeDND);
  function onBlur() {
    isFocusingAddGoal = false;
    //TODO - this is Workaround - to fix the bug of iOS keyboard displacing the web app in WebView
    if ($context.embed === Embed.HANDSET) appStore.gotoPath("/focus");
  }
  function onfocus() {
    isFocusingAddGoal = true;
  }
</script>

<div
  class={cn("flex flex-col w-full h-full gap-6 pb-48 overflow-auto", {
    "pt-6": isInEditMode
  })}
  bind:this={ref}
>
  {#if $focusItemsStore.goals.length === 0 && !isInEditMode && $sessionStore.isSessionRunning}
    <div class="h-full">
      <EmptyStatusView
        size={Size.sm}
        mainText="No focus items added."
        subText="Toggle edit mode to add focus items."
      />
    </div>
  {:else}
    {#each $focusItemsStore.goals as item, index (item)}
      <FocusItem
        {isInEditMode}
        {item}
        tasksList={$focusItemsStore.tasks}
        isFocusAddTask={$lastActiveGoalIdForEditing
          ? $lastActiveGoalIdForEditing === item.id
          : index === $focusItemsStore.goals.length - 1}
      />
    {/each}
  {/if}

  {#if !$sessionStore.isSessionRunning || isInEditMode}
    <div class="flex flex-col gap-2 w-full pt-4">
      <div
        class="flex items-center w-full border rounded-md {isFocusingAddGoal
          ? 'border-aps1'
          : 'border-brs3'}"
      >
        <AddGoal bind:label={goalEntry} on:blur={onBlur} on:focus={onfocus} />
      </div>
    </div>
  {/if}
</div>
