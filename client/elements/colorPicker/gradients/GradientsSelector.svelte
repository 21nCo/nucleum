<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import { createEventDispatcher } from "svelte";
  import { gradientsList } from "./gradients";
  import Icon from "../../Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  const dispatch = createEventDispatcher();
  export let value: string;
  function handleGradientClick(id: string) {
    value = id;
    dispatch("change", id);
  }
</script>

<div class="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-4">
  {#each gradientsList as gradient}
    <button
      class={cn("relative h-40 rounded-md", gradient.gradient, {})}
      on:click={() => handleGradientClick(gradient.id)}
    >
      {#if gradient.id === value}
        <div
          class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
        >
          <Icon
            icon="check-circle"
            isFilled={true}
            size={Size.lg}
            class="text-fgs1 shadow-md rounded-full border border-fgs1"
          />
        </div>
      {/if}
    </button>
  {/each}
</div>
