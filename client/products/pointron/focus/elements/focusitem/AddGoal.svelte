<script lang="ts">
  import { focusItemsStore } from "$lib/client/products/pointron/focus/session.store";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { toasts } from "$lib/client/stores/notification.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { Placement } from "$lib/client/types/direction.enum";
  import { InputStyle } from "$lib/client/types/input.type";
  import TextSearchInput from "$lib/client/elements/input/TextSearchInput.svelte";
  import GoalSearchThumbnail from "../../../goals/thumbnails/GoalSearchThumbnail.svelte";
  import { newGoal } from "../../../goals/create/store";
  export let label: string = "";
  let inputRef: any;
  async function save(event: any) {
    let goal = event?.detail?.item;
    console.log("Goal: ", goal);
    if (!goal || !goal.id) return;
    if ($focusItemsStore.goals.some((x) => x.id === goal.id)) {
      toasts.error("Goal already exists in focus list");
      return;
    }
    reset();
    await focusItemsStore.addGoal(goal.id);
  }
  function reset() {
    inputRef.reset();
  }
  async function handleEmptyEnter(e: CustomEvent<string>) {
    console.log({ e });
    const goal = await newGoal.saveGoalWithLabel(e.detail);
    if (!goal) {
      toasts.error("Something went wrong. Please try again later.");
      return;
    }
    await focusItemsStore.addGoal(goal.id);
    reset();
  }
</script>

<div class="flex items-center gap-2 w-full px-4 h-14">
  <TextSearchInput
    on:blur
    on:focus
    on:select={save}
    on:empty-enter={handleEmptyEnter}
    bind:value={label}
    bind:this={inputRef}
    emptyStateLabel="No goals found. Press **Enter** to create a new goal."
    searchResultComponent={GoalSearchThumbnail}
    searchStoreId={Resource.PointGoal}
    style={InputStyle.PLAIN}
    popoverOptions={{ offsetInPx: 16 }}
    placeholder="+ start typing a goal name..."
  />

  <div class=" justify-end items-center">
    {#if label}
      <div class="flex gap-2">
        <Button
          on:click={reset}
          icon="cross"
          tooltip="Clear"
          tooltipOptions={{
            placement: Placement.Left
          }}
        />
      </div>
    {/if}
  </div>
</div>
