<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { taskStore } from "./task.store";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let isChecked = false;
  export let id: IRecordId;
  export let size: Size = Size.md;
  function onToggle() {
    isChecked = !isChecked;
    taskStore.toggle(id);
    dispatch("toggle", id);
  }
</script>

<!-- <input
  class="w-4 h-4"
  type="checkbox"
  bind:checked={isChecked}
  on:change={onToggle}
/> -->

<button on:click={onToggle}>
  <div
    class={cn("rounded-md flex items-center justify-center border", {
      "bg-aps1 border-transparent": isChecked,
      "border-fgs4": !isChecked,
      "w-4 h-4": size === Size.md,
      "w-5 h-5": size === Size.lg
    })}
  >
    {#if isChecked}
      <Icon icon="ph:check" class="text-abg" size={Size.sm} />
    {/if}
  </div>
</button>
