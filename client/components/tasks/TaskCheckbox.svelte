<script lang="ts">
  import Icon from "@21n/elements/Icon.svelte";
  import type { IRecordId } from "@21n/types/data.type";
  import { Size } from "@21n/types/size.enum";
  import { cn } from "@21n/utils/ui.utils";
  import { taskStore } from "@21n/components/tasks/task.store";
  import { createEventDispatcher } from "svelte";
  import type { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
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
