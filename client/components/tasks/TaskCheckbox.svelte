<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { taskStore } from "./task.store";
  import { createEventDispatcher } from "svelte";
  import type { ResourceAccessPoint } from "../flux/resourceStores/resource.type";
  const dispatch = createEventDispatcher();
  export let isChecked = false;
  export let id: IRecordId;
  export let size: Size = Size.md;
  export let accessPoint: ResourceAccessPoint;
  export let isAccentBg = false;
  function onToggle(e: MouseEvent) {
    e.stopPropagation();
    isChecked = !isChecked;
    taskStore.toggle(id, {
      context: accessPoint
    });
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
      "bg-aps1 border-transparent": isChecked && !isAccentBg,
      "bg-ccs3 border-transparent": isChecked && isAccentBg,
      "border-fgs4": !isChecked && !isAccentBg,
      "border-cbg": !isChecked && isAccentBg,
      "w-4 h-4": size === Size.md,
      "w-5 h-5": size === Size.lg
    })}
  >
    {#if isChecked}
      <Icon
        icon="ph:check"
        class={cn({ "text-abg": !isAccentBg, "text-ccs1": isAccentBg })}
        size={Size.sm}
      />
    {/if}
  </div>
</button>
