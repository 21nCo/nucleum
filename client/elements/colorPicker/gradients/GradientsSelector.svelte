<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import { createEventDispatcher } from "svelte";
  import { gradientsList } from "./gradients";
  import Icon from "../../Icon.svelte";
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
          class="absolute top-0 left-0 w-full h-full flex items-center justify-center"
        >
          <Icon icon="ph:check-circle-fill" class="text-fgs1" />
        </div>
      {/if}
    </button>
  {/each}
</div>
