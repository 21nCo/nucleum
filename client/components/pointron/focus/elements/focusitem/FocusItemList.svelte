<script lang="ts">
  import {
    focusItemsStore,
    lastActiveGoalIdForEditing,
    sessionStore
  } from "$lib/client/components/pointron/focus/session.store";
  import { onDestroy, onMount } from "svelte";
  import FocusItem from "./FocusItem.svelte";
  import AddGoal from "./AddGoal.svelte";
  import AddTask from "./AddTask.svelte";
  import {
    appStore,
    dragAndDropStore,
    isInEditMode
  } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import { handleFocusItemsDND } from "$lib/client/utils/dragDrop";
  import { LaunchContext } from "$lib/client/types/appStore.type";
  import { pointronEvents } from "$lib/client/components/pointron/local.store";
  import type { PointronEvent } from "$lib/client/types/pointron/pointronEvent.type";
  import { PointronEventEnum } from "$lib/client/types/pointron/pointronEvent.enum";
  import { DragStatus } from "$lib/client/types/dragstatus.enum";
  import { DND } from "$lib/client/utils/DragDropTouch";
  import { transformFocusItems } from "$lib/client/components/pointron/focus/session.utils";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { Size } from "$lib/client/types/size.enum";
  let items: any[] = [];
  let goalEntry: string = "";
  let isFocusingAddGoal: boolean = false;
  let DragDropTouch: any;
  let ref: any;
  onMount(() => {
    refresh();
    DND(DragDropTouch || (DragDropTouch = {}), ref);
    const eventSub = pointronEvents.subscribe((x: PointronEvent) => {
      if (x.event === PointronEventEnum.REFRESH_FOCUSITEMS) {
        refresh();
      }
    });
    return () => {
      eventSub();
    };
  });
  const unSubscribeDND = dragAndDropStore.subscribe(async (x: any) => {
    if (
      (x.dragId == "goalItem" || x.dragId == "soloTaskItem") &&
      (x.dropId == "goalItem" || x.dropId == "soloTaskItem") &&
      $dragAndDropStore.dragStatus == DragStatus.DROPPED
    ) {
      console.log("This subscribe is for goals & soloTasks so entering");
      let modifiedItems = handleFocusItemsDND(x, items);
      if (modifiedItems) {
        await focusItemsStore.updateOrderValueForFI(modifiedItems);
        items = modifiedItems;
        dragAndDropStore.reset();
      }
    }
  });
  onDestroy(unSubscribeDND);
  function refresh() {
    items = [];
    items = transformFocusItems($focusItemsStore.items);
  }
  function onBlur() {
    isFocusingAddGoal = false;
    //to fix the bug of iOS keyboard displacing the web app in WebView
    if ($appStore.launchContext === LaunchContext.EMBED)
      appStore.gotoPath("/focus");
  }
  function onfocus() {
    isFocusingAddGoal = true;
  }
</script>

<div class="flex flex-col w-full h-full gap-6 pb-36 mt-3" bind:this={ref}>
  {#if items.length === 0 && !$isInEditMode && $sessionStore.isSessionRunning}
    <div class="h-full">
      <EmptyStatusView
        size={Size.sm}
        mainText="No focus items added."
        subText="Toggle edit mode to add focus items."
      />
    </div>
  {:else}
    {#each items as item, index (item)}
      <FocusItem
        isInEditMode={$isInEditMode}
        {item}
        isFocusAddTask={$lastActiveGoalIdForEditing
          ? $lastActiveGoalIdForEditing === item.goalId
          : index === items.length - 1}
      />
    {/each}
  {/if}

  {#if !$sessionStore.isSessionRunning || $isInEditMode}
    <div class="flex flex-col gap-2 w-full pt-4">
      <div
        class="flex items-center w-full border rounded-md {isFocusingAddGoal
          ? 'border-aps1'
          : 'border-brs3'}"
      >
        <AddGoal bind:label={goalEntry} on:blur={onBlur} on:focus={onfocus} />
      </div>
      <!-- <div class="flex items-center w-full border border-bgs2 rounded-md">
        <AddTask placeholder={"add solo task instead"} on:blur={onBlur} />
      </div> -->
    </div>
  {/if}
</div>
