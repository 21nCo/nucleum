<script lang="ts">
  import { focusItemsStore } from "$lib/client/components/pointron/focus/session.store";
  import { Item } from "$lib/client/types/item.enum";
  import { toasts } from "$lib/client/stores/notification.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { Direction } from "$lib/client/types/direction.enum";
  import { InputStyle } from "$lib/client/types/input.type";
  import TextSearchInput from "$lib/client/elements/input/TextSearchInput.svelte";
  export let label: string = "";
  let inputRef: any;
  async function save(event: any) {
    let goal = event?.detail?.item;
    if (!goal || !goal.id) return;
    if ($focusItemsStore.items.some((x) => x.goalId === goal.id)) {
      toasts.error("Goal already exists in focus list");
      return;
    }
    reset();
    await focusItemsStore.addGoal({
      goalId: goal.id,
      label: goal.label,
      color: goal.color ?? goal.parent?.color,
      order: $focusItemsStore.items.length,
      estimated: 0,
      checked: false,
      worked: 0
    });
  }
  function reset() {
    inputRef.reset();
  }
</script>

<div class="flex items-center gap-2 w-full px-4 h-14">
  <TextSearchInput
    on:blur
    on:focus
    on:select={save}
    bind:value={label}
    bind:this={inputRef}
    searchStoreId={Item.PointGoal}
    style={InputStyle.PLAIN}
    placeholder="+ start typing a goal name..."
  />

  <div class=" justify-end items-center">
    {#if label}
      <div class="flex gap-2">
        <Button
          on:click={reset}
          icon="cross"
          tooltip="Clear"
          toolTipPlacement={Direction.Left}
        />
      </div>
    {/if}
  </div>
</div>
