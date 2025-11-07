<script lang="ts">
  import { Size } from "@21n/types/size.enum";
  import { bg, cn } from "@21n/utils/ui.utils";
  import Icon from "../Icon.svelte";
  import { tooltip as tooltipAction } from "@21n/actions/popover.action";
  import { ButtonVariant } from "@21n/types/button.type";
  export let icon: string | undefined = undefined;
  export let tooltip: string | undefined = undefined;
  export let label: string | undefined = undefined;
  export let size: Size.xs | Size.sm | Size.md | Size.lg = Size.md;
  export let parentBgIndex: number = 1;
  export let width: string = "";
  export let type: ButtonVariant = ButtonVariant.SECONDARY;
</script>

<button
  class={cn(
    "flex gap-1 justify-center h-full w-full items-center text-b2",
    width,
    `hover:${bg(parentBgIndex)}-striped`
  )}
  on:click
  use:tooltipAction={{
    text: tooltip
  }}
>
  {#if icon}
    <Icon
      {icon}
      size={size ?? Size.md}
      class={cn({
        "text-ars1": type === ButtonVariant.DANGER
      })}
    />
  {/if}
  {#if label}
    {label}
  {/if}
</button>
