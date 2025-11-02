<script lang="ts">
  import { ButtonStyle, type IButtonParams } from "@21n/types/button.type";
  import { Size } from "@21n/types/size.enum";
  import { cn } from "@21n/utils/ui.utils";
  import Button from "@21n/elements/button/Button.svelte";
  import BoxButton from "./BoxButton.svelte";
  export let buttons: IButtonParams[] = [];
  export let size: Size.xs | Size.sm | Size.md | Size.lg = Size.md;
  export let isFooter: boolean = false;
  export let parentBgIndex: number = 1;
  export let width: string = "";
</script>

<div
  class={cn(
    "grid w-full",
    {
      "grid-flow-col auto-cols-max": true,
      "h-full": !isFooter,
      "grid-cols-[repeat(auto-fit,minmax(0,1fr))]": isFooter
    },
    isFooter && {
      "min-h-10 h-10": size === Size.xs,
      "min-h-12 h-12": size === Size.sm,
      "min-h-14 h-14": size === Size.md,
      "min-h-16 h-16": size === Size.lg
    }
  )}
>
  {#if isFooter}
    {#each buttons as button}
      <div
        class={cn(
          "w-full h-full",
          {
            "border-t": isFooter
          },
          isFooter && {
            "border-brs2": parentBgIndex === 1,
            "border-brs3": parentBgIndex !== 1
          }
        )}
      >
        <Button
          {...button}
          style={button.style ?? ButtonStyle.OUTLINED}
          isBoxed={true}
          on:click={button.callback?.bind(null, {})}
        />
      </div>
    {/each}
  {:else}
    {#each buttons as button}
      <div class={cn("h-full", width)}>
        <BoxButton
          icon={button.icon}
          label={button.label}
          size={button.size ?? Size.md}
          tooltip={button.tooltip}
          {parentBgIndex}
          on:click={button.callback?.bind(null, {})}
        />
      </div>
    {/each}
  {/if}
</div>
