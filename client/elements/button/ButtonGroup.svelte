<script lang="ts">
  import { type IButtonParams } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import Button from "./Button.svelte";
  export let buttons: IButtonParams[] = [];
  export let size: Size.xs | Size.sm | Size.md | Size.lg = Size.md;
</script>

<div
  class={cn("grid", `grid-cols-${buttons.length} w-full`, {
    "h-10": size === Size.xs,
    "h-12": size === Size.sm,
    "h-14": size === Size.md,
    "h-16": size === Size.lg
  })}
>
  {#each buttons as button}
    <div class="w-full h-full">
      <Button
        {...button}
        isBoxed={true}
        on:click={button.callback?.bind(null, {})}
      />
    </div>
  {/each}
</div>
