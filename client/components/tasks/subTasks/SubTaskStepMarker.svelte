<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import { Size } from "$lib/client/types/size.enum";
  import type { ITask } from "../task.type";
  import Icon from "$lib/client/elements/Icon.svelte";

  export let subTask: ITask | { label?: string; type: string };
  export let index: number;
  export let totalLength: number;
</script>

<div class="flex flex-col items-center relative z-10">
  <div
    class={cn(
      "w-8 h-8 rounded-full bg-bgs2 text-fgs3 text-b2 flex items-center justify-center border border-brs3",
      {
        "group-hover:bg-aps2 group-hover:border-aps1 group-hover:text-aps1":
          subTask.label
      }
    )}
  >
    {#if subTask.type === "add"}
      <Icon icon="ph:plus-light" class="text-fgs3" size={Size.sm} />
    {:else}
      {index + 1}
    {/if}
  </div>
  {#if index !== totalLength - 1}
    <div class="w-0.5 h-12 bg-bgs2 absolute top-8 left-4 -translate-x-1/2" />
  {/if}
</div>
