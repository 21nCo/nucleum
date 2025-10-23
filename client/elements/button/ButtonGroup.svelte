<script lang="ts">
  import { ButtonStyle, type IButtonParams } from "@21n/types/button.type";
  import { Size } from "@21n/types/size.enum";
  import { cn } from "@21n/utils/ui.utils";
  import Button from "@21n/elements/button/Button.svelte";
  export let buttons: IButtonParams[] = [];
  export let size: Size.xs | Size.sm | Size.md | Size.lg = Size.md;

  function resolveGridColumns(count: number) {
    if (count <= 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-2";
    if (count === 3) return "grid-cols-3";
    if (count === 4) return "grid-cols-4";
    if (count === 5) return "grid-cols-5";
    return "grid-cols-6";
  }

  $: columnsClass = resolveGridColumns(buttons.length);
</script>

<div
  class={cn("grid w-full", columnsClass, {
    "h-10": size === Size.xs,
    "h-12": size === Size.sm,
    "h-14": size === Size.md,
    "h-16": size === Size.lg
  })}
>
  {#each buttons as button}
    <div class="w-full h-full border-t border-brs2">
      <Button
        {...button}
        isBoxed={true}
        on:click={button.callback?.bind(null, {})}
      />
    </div>
  {/each}
</div>
